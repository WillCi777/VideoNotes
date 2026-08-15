/**
 * Shared, non-secret configuration helpers.
 *
 * API keys are stored in chrome.storage.local by options.js. This file contains
 * defaults and validation only, so it is safe to publish.
 *
 * Supported AI providers: DeepSeek (default), OpenAI (ChatGPT), Google Gemini.
 * Each provider has its own API key and model fields; the active one is
 * selected by `provider`.
 */
var YTD_SETTINGS = (() => {
  const STORAGE_KEY = "ytd_settings";

  const SUPPORTED_PROVIDERS = Object.freeze(["deepseek", "openai", "gemini"]);

  const PROVIDER_DEFAULTS = Object.freeze({
    deepseek: Object.freeze({
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-flash",
    }),
    openai: Object.freeze({
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
    }),
    gemini: Object.freeze({
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.0-flash",
    }),
  });

  const DEFAULTS = Object.freeze({
    provider: "deepseek",
    aiApiKey: "",
    aiBaseUrl: PROVIDER_DEFAULTS.deepseek.baseUrl,
    aiModel: PROVIDER_DEFAULTS.deepseek.model,
    openaiApiKey: "",
    openaiModel: PROVIDER_DEFAULTS.openai.model,
    geminiApiKey: "",
    geminiModel: PROVIDER_DEFAULTS.gemini.model,
    supadataApiKey: "",
  });

  const trimString = (value) =>
    typeof value === "string" ? value.trim() : "";

  /**
   * A legacy "custom" provider config (or any provider name we no longer
   * recognize) is migrated: the AI key is cleared because it belonged to an
   * unknown service, while the Supadata key is kept.
   */
  function isLegacyCustom(input) {
    return (
      !!input &&
      typeof input.provider === "string" &&
      !SUPPORTED_PROVIDERS.includes(input.provider)
    );
  }

  function normalize(input = {}) {
    const legacy = isLegacyCustom(input);
    const provider =
      legacy || !SUPPORTED_PROVIDERS.includes(input.provider)
        ? DEFAULTS.provider
        : input.provider;
    return {
      provider,
      aiApiKey: legacy ? "" : trimString(input.aiApiKey),
      aiBaseUrl: PROVIDER_DEFAULTS[provider].baseUrl,
      aiModel: PROVIDER_DEFAULTS[provider].model,
      openaiApiKey: trimString(input.openaiApiKey),
      openaiModel:
        trimString(input.openaiModel) || PROVIDER_DEFAULTS.openai.model,
      geminiApiKey: trimString(input.geminiApiKey),
      geminiModel:
        trimString(input.geminiModel) || PROVIDER_DEFAULTS.gemini.model,
      supadataApiKey: trimString(input.supadataApiKey),
    };
  }

  function migrateLegacyCustom(input = {}) {
    return {
      settings: normalize(input),
      migrated: isLegacyCustom(input),
    };
  }

  function chatCompletionsUrl() {
    return `${DEFAULTS.aiBaseUrl}/chat/completions`;
  }

  function canonicalYouTubeUrl(videoId) {
    const normalized = String(videoId || "").trim();
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(normalized)) {
      throw new Error("Invalid YouTube video ID.");
    }
    return `https://www.youtube.com/watch?v=${normalized}`;
  }

  // --- Active-provider accessors -------------------------------------------

  function activeAiKey(settings = {}) {
    switch (settings.provider) {
      case "openai":
        return settings.openaiApiKey || "";
      case "gemini":
        return settings.geminiApiKey || "";
      default:
        return settings.aiApiKey || "";
    }
  }

  function activeAiModel(settings = {}) {
    switch (settings.provider) {
      case "openai":
        return settings.openaiModel || PROVIDER_DEFAULTS.openai.model;
      case "gemini":
        return settings.geminiModel || PROVIDER_DEFAULTS.gemini.model;
      default:
        return settings.aiModel || PROVIDER_DEFAULTS.deepseek.model;
    }
  }

  function activeAiBaseUrl(settings = {}) {
    switch (settings.provider) {
      case "openai":
        return PROVIDER_DEFAULTS.openai.baseUrl;
      case "gemini":
        return PROVIDER_DEFAULTS.gemini.baseUrl;
      default:
        return settings.aiBaseUrl || PROVIDER_DEFAULTS.deepseek.baseUrl;
    }
  }

  return {
    STORAGE_KEY,
    SUPPORTED_PROVIDERS,
    PROVIDER_DEFAULTS,
    DEFAULTS,
    isLegacyCustom,
    normalize,
    migrateLegacyCustom,
    chatCompletionsUrl,
    canonicalYouTubeUrl,
    activeAiKey,
    activeAiModel,
    activeAiBaseUrl,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_SETTINGS;
}
