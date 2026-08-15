/**
 * SERVICES — AI CLIENT
 *
 * Low-level AI provider client. Builds the provider-specific request
 * (DeepSeek / OpenAI chat completions, Google Gemini generateContent),
 * enforces idle/hard timeouts, and reads the response under a hard byte cap.
 * Product features use bounded, predictable latency rather than reasoning
 * traces.
 */

const AI_PROVIDER_IDLE_TIMEOUT_MS = 50_000;
const AI_PROVIDER_HARD_TIMEOUT_MS = 120_000;
const AI_PROVIDER_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const AI_PROVIDER_NAMES = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  gemini: "Gemini",
};

function providerName(settings) {
  return AI_PROVIDER_NAMES[settings?.provider] || "DeepSeek";
}

/**
 * Resolves the active provider's key/model/base URL. Kept independent of
 * YTD_SETTINGS helpers so test harnesses that stub YTD_SETTINGS still work.
 */
function providerInfo(settings = {}) {
  const provider = settings.provider;
  if (provider === "openai") {
    return {
      provider,
      name: "OpenAI",
      apiKey: settings.openaiApiKey || "",
      model: settings.openaiModel || "gpt-4o",
      baseUrl: "https://api.openai.com/v1",
    };
  }
  if (provider === "gemini") {
    return {
      provider,
      name: "Gemini",
      apiKey: settings.geminiApiKey || "",
      model: settings.geminiModel || "gemini-2.0-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    };
  }
  if (provider === "custom") {
    // Any OpenAI-compatible endpoint: user-supplied base URL, model, and key.
    return {
      provider,
      name: "Custom",
      apiKey: settings.customApiKey || "",
      model: settings.customModel || "",
      baseUrl: String(settings.customBaseUrl || "").replace(/\/+$/, ""),
    };
  }
  return {
    provider: "deepseek",
    name: "DeepSeek",
    apiKey: settings.aiApiKey || "",
    model: settings.aiModel || "deepseek-v4-flash",
    baseUrl: settings.aiBaseUrl || "https://api.deepseek.com",
  };
}

/**
 * Builds the provider-specific { url, headers, body } for a completion call.
 */
function buildProviderRequest({ info, messages, maxTokens, temperature, responseFormat }) {
  if (info.provider === "gemini") {
    const url = `${info.baseUrl}/models/${encodeURIComponent(info.model)}:generateContent?key=${encodeURIComponent(info.apiKey)}`;
    const contents = messages.map((message) => {
      if (message.role === "system") {
        // Gemini has no system role; fold system instructions into a user part.
        return { role: "user", parts: [{ text: `[System]\n${message.content}` }] };
      }
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      };
    });
    const generationConfig = {};
    if (typeof temperature === "number") generationConfig.temperature = temperature;
    if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
    if (responseFormat) generationConfig.responseMimeType = "application/json";
    return {
      url,
      headers: { "Content-Type": "application/json" },
      body: { contents, generationConfig },
    };
  }

  // DeepSeek and OpenAI both speak the OpenAI chat-completions protocol.
  const body = {
    model: info.model,
    max_tokens: maxTokens,
    messages,
  };
  if (typeof temperature === "number") body.temperature = temperature;
  if (responseFormat) body.response_format = responseFormat;
  if (info.provider === "deepseek") {
    // DeepSeek-only request field: product features need bounded, predictable
    // latency rather than reasoning traces.
    body.thinking = { type: "disabled" };
  }
  return {
    url: `${info.baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${info.apiKey}`,
    },
    body,
  };
}

function extractProviderText(info, data) {
  if (info.provider === "gemini") {
    return data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") || "";
  }
  return data?.choices?.[0]?.message?.content || "";
}

async function requestAiCompletion({
  messages,
  maxTokens,
  temperature,
  responseFormat,
}) {
  const settings = await getSettings();
  const info = providerInfo(settings);
  if (!info.apiKey) {
    const error = new Error(
      `${info.name} API key not configured. Open YouTube Digest Settings.`,
    );
    error.code = "NO_AI_KEY";
    throw error;
  }
  if (info.provider === "custom" && !info.baseUrl) {
    const error = new Error(
      "Custom provider Base URL not configured. Open YouTube Digest Settings.",
    );
    error.code = "NO_AI_BASE_URL";
    throw error;
  }

  const { url, headers, body } = buildProviderRequest({
    info,
    messages,
    maxTokens,
    temperature,
    responseFormat,
  });

  const controller = new AbortController();
  let timeoutKind = "";
  let idleTimeoutId;
  let hardTimeoutId;
  const abortForTimeout = (kind) => {
    if (controller.signal.aborted) return;
    timeoutKind = kind;
    controller.abort();
  };
  const resetIdleTimeout = () => {
    clearTimeout(idleTimeoutId);
    idleTimeoutId = setTimeout(
      () => abortForTimeout("idle"),
      AI_PROVIDER_IDLE_TIMEOUT_MS,
    );
  };

  hardTimeoutId = setTimeout(
    () => abortForTimeout("hard"),
    AI_PROVIDER_HARD_TIMEOUT_MS,
  );
  resetIdleTimeout();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // Receiving headers proves the provider is still making progress. The
    // provider may then send blank-line body chunks while a non-streaming
    // request queues.
    resetIdleTimeout();

    const data = await readBoundedAiResponse(response, resetIdleTimeout);
    if (!response.ok) {
      const errorData = data && typeof data === "object" ? data : {};
      const error = new Error(
        errorData.error?.message ||
          errorData.message ||
          `${info.name} error: ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }

    const text = extractProviderText(info, data);
    if (typeof text !== "string" || !text.trim()) {
      const error = new Error(`${info.name} returned an empty response.`);
      error.code = "EMPTY_AI_RESPONSE";
      throw error;
    }

    return { text, settings };
  } catch (error) {
    if (timeoutKind === "idle") {
      const timeoutError = new Error(
        `${info.name} request was inactive for 50 seconds. Please Retry.`,
      );
      timeoutError.code = "AI_IDLE_TIMEOUT";
      throw timeoutError;
    }
    if (timeoutKind === "hard") {
      const timeoutError = new Error(
        `${info.name} request exceeded the 120-second limit. Please Retry.`,
      );
      timeoutError.code = "AI_HARD_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(idleTimeoutId);
    clearTimeout(hardTimeoutId);
  }
}

async function readBoundedAiResponse(response, onActivity) {
  const reader = response.body?.getReader?.();
  if (reader) {
    const decoder = new TextDecoder();
    let responseText = "";
    let responseBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      // Every received chunk is activity, including the provider's blank lines.
      onActivity();
      const byteLength = value?.byteLength ?? 0;
      responseBytes += byteLength;
      if (responseBytes > AI_PROVIDER_MAX_RESPONSE_BYTES) {
        await reader.cancel?.().catch(() => {});
        const error = new Error("AI response exceeded the 2 MiB limit.");
        error.code = "AI_RESPONSE_TOO_LARGE";
        throw error;
      }
      responseText += decoder.decode(value, { stream: true });
    }
    responseText += decoder.decode();
    return JSON.parse(responseText.trimStart());
  }

  // Some fetch implementations do not expose a readable stream. Preserve a
  // bounded body read for that case.
  if (typeof response.text === "function") {
    const responseText = await response.text();
    onActivity();
    const byteLength = new TextEncoder().encode(responseText).byteLength;
    if (byteLength > AI_PROVIDER_MAX_RESPONSE_BYTES) {
      const error = new Error("AI response exceeded the 2 MiB limit.");
      error.code = "AI_RESPONSE_TOO_LARGE";
      throw error;
    }
    return JSON.parse(responseText.trimStart());
  }

  // Legacy/test fetch shims may expose only json(). The hard and idle timers
  // still bound this fallback even though chunk-level activity is unavailable.
  const data = await response.json();
  onActivity();
  return data;
}
