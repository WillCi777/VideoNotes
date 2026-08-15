const test = require("node:test");
const assert = require("node:assert/strict");

const settings = require("../settings.js");

test("DeepSeek defaults use V4 Flash", () => {
  const normalized = settings.normalize({
    provider: "deepseek",
    aiApiKey: "  example-key  ",
    aiBaseUrl: "https://api.example.com/v1",
    aiModel: "example-model",
    supadataApiKey: "  example-supadata  ",
  });

  assert.equal(normalized.provider, "deepseek");
  assert.equal(normalized.aiBaseUrl, "https://api.deepseek.com");
  assert.equal(normalized.aiModel, "deepseek-v4-flash");
  assert.equal(normalized.aiApiKey, "example-key");
  assert.equal(normalized.supadataApiKey, "example-supadata");
  assert.equal(
    settings.chatCompletionsUrl(),
    "https://api.deepseek.com/chat/completions",
  );
});

test("unknown provider names are treated as legacy and fall back to DeepSeek", () => {
  const normalized = settings.normalize({
    provider: "unexpected",
    aiApiKey: "  example-key  ",
  });

  assert.equal(normalized.provider, "deepseek");
  assert.equal(normalized.aiApiKey, "");
  assert.equal(normalized.aiModel, "deepseek-v4-flash");
});

test("OpenAI and Gemini providers keep their own keys and models", () => {
  const openai = settings.normalize({
    provider: "openai",
    openaiApiKey: " sk-openai  ",
    openaiModel: "gpt-4o-mini",
    aiApiKey: "deepseek-key-should-be-kept",
  });
  assert.equal(openai.provider, "openai");
  assert.equal(openai.openaiApiKey, "sk-openai");
  assert.equal(openai.openaiModel, "gpt-4o-mini");
  assert.equal(openai.aiApiKey, "deepseek-key-should-be-kept");
  assert.equal(openai.aiModel, "gpt-4o");

  const gemini = settings.normalize({
    provider: "gemini",
    geminiApiKey: " sk-gemini  ",
  });
  assert.equal(gemini.provider, "gemini");
  assert.equal(gemini.geminiApiKey, "sk-gemini");
  assert.equal(gemini.geminiModel, "gemini-2.0-flash");
  assert.equal(gemini.aiBaseUrl, "https://generativelanguage.googleapis.com/v1beta");
});

test("active-provider accessors resolve the selected provider", () => {
  const deepseek = settings.normalize({ aiApiKey: "ds-key" });
  assert.equal(settings.activeAiKey(deepseek), "ds-key");
  assert.equal(settings.activeAiModel(deepseek), "deepseek-v4-flash");
  assert.equal(settings.activeAiBaseUrl(deepseek), "https://api.deepseek.com");

  const openai = settings.normalize({
    provider: "openai",
    openaiApiKey: "oa-key",
    aiApiKey: "ds-key",
  });
  assert.equal(settings.activeAiKey(openai), "oa-key");
  assert.equal(settings.activeAiModel(openai), "gpt-4o");
  assert.equal(settings.activeAiBaseUrl(openai), "https://api.openai.com/v1");

  const gemini = settings.normalize({
    provider: "gemini",
    geminiApiKey: "gm-key",
  });
  assert.equal(settings.activeAiKey(gemini), "gm-key");
  assert.equal(settings.activeAiModel(gemini), "gemini-2.0-flash");

  // Unconfigured provider still resolves to the default model.
  assert.equal(settings.activeAiKey(settings.normalize({})), "");
  assert.equal(settings.activeAiModel(settings.normalize({})), "deepseek-v4-flash");
});

test("legacy custom migration clears only the AI key and is idempotent", () => {
  const legacy = {
    provider: "custom",
    aiApiKey: "custom-secret",
    aiBaseUrl: "https://api.example.com/v1",
    aiModel: "example-model",
    supadataApiKey: " supadata-secret ",
  };
  const first = settings.migrateLegacyCustom(legacy);

  assert.equal(first.migrated, true);
  assert.equal(first.settings.provider, "deepseek");
  assert.equal(first.settings.aiBaseUrl, settings.DEFAULTS.aiBaseUrl);
  assert.equal(first.settings.aiModel, settings.DEFAULTS.aiModel);
  assert.equal(first.settings.aiApiKey, "");
  assert.equal(first.settings.supadataApiKey, "supadata-secret");

  const second = settings.migrateLegacyCustom(first.settings);
  assert.equal(second.migrated, false);
  assert.deepEqual(second.settings, first.settings);

  const configuredDeepSeek = settings.normalize({
    ...first.settings,
    aiApiKey: "new-deepseek-key",
  });
  assert.equal(configuredDeepSeek.aiApiKey, "new-deepseek-key");
});

test("Supadata receives a canonical YouTube URL", () => {
  assert.equal(
    settings.canonicalYouTubeUrl("ydTeb_I0b94"),
    "https://www.youtube.com/watch?v=ydTeb_I0b94",
  );
  assert.throws(
    () => settings.canonicalYouTubeUrl('"><script>'),
    /Invalid YouTube video ID/,
  );
});
