const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("manifest uses minimized install-time permissions", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, "116");
  assert.equal(packageJson.version, manifest.version);
  assert.equal(manifest.options_ui.page, "options.html");
  assert.ok(!manifest.permissions.includes("activeTab"));
  assert.ok(manifest.host_permissions.includes("https://api.deepseek.com/*"));
  assert.equal(Object.hasOwn(manifest, "optional_host_permissions"), false);
  assert.equal(manifest.version, "2.0.0");
});

test("release documentation covers current installation, data and attribution", () => {
  const readme = read("README.md");
  const english = read("README.en.md");
  const manifest = JSON.parse(read("manifest.json"));
  assert.match(readme, /chrome:\/\/extensions/);
  assert.match(readme, /manifest\.json/);
  assert.match(readme, /B站不需要 Supadata/);
  assert.match(readme, /生成修订稿/);
  assert.match(readme, /本地保存不等于完全离线/);
  assert.match(readme, /WillCi777\/youtube-digest-Next/);
  assert.match(readme, /LICENSE/);
  assert.match(english, /Chrome 116/);
  assert.equal(manifest.name, "YouTube Digest");
  assert.match(read("scripts/package-extension.sh"), /youtube-digest-v\$version\.zip/);

  const optionsPage = read("options.html");
  const optionsStyles = read("options.css");
  // The options logic is split across the entry and the OPTIONS modules.
  const optionsScript = [
    "options.js",
    "src/options/i18n.js",
    "src/options/storage.js",
    "src/options/main.js",
  ]
    .map(read)
    .join("\n");
  assert.match(optionsPage, /dash\.supadata\.ai\/auth\/sign-up/i);
  assert.match(optionsPage, /platform\.deepseek\.com\/api_keys/i);
  assert.match(optionsPage, /platform\.openai\.com\/api-keys/i);
  assert.match(optionsPage, /aistudio\.google\.com\/app\/apikey/i);
  assert.doesNotMatch(optionsPage, /<select\b/i);
  assert.doesNotMatch(optionsPage, /id="(?:provider|aiBaseUrl)"/);
  const detailsTag = optionsPage.match(
    /<details\b[^>]*class="card customization-card"[^>]*>/,
  );
  assert.ok(detailsTag, "Expected a native Local remix details disclosure");
  assert.doesNotMatch(detailsTag[0], /\sopen(?:\s|=|>)/i);
  assert.match(
    optionsPage,
    /<summary class="customization-summary">[\s\S]*Want to use another AI model\?[\s\S]*Edit and copy a safe prompt for your coding agent[\s\S]*<\/summary>/,
  );
  assert.match(
    optionsPage,
    /class="customization-steps"[\s\S]*Open the extracted YouTube Digest project folder in your coding[\s\S]*Replace \[PROVIDER\] and \[MODEL\][\s\S]*Never include API keys[\s\S]*<\/ol>/,
  );
  assert.match(
    optionsPage,
    /class="prompt-reminder"[\s\S]*Before copying, replace \[PROVIDER\] and \[MODEL\]/,
  );
  assert.doesNotMatch(optionsPage, /~\/Documents\/youtube-digest/);
  assert.doesNotMatch(optionsPage, /%USERPROFILE%\\Documents\\youtube-digest/);
  assert.match(optionsPage, /id="copyCustomizationPromptBtn"/);
  assert.match(optionsStyles, /\.customization-summary:hover\s*\{/);
  assert.match(optionsStyles, /\.customization-summary:focus-visible\s*\{/);
  assert.match(optionsStyles, /\.data-card\s*\{[^}]*margin-top:\s*36px;/);
  assert.match(optionsScript, /clipboard\.writeText/);
  assert.match(optionsScript, /Edited prompt copied\./);
  assert.match(optionsScript, /migration\.migrated[\s\S]*storage\.set/);

  const customizationPrompt = `Customize this local YouTube Digest workspace to use [PROVIDER] with [MODEL]. Work only in the current workspace. Before editing, verify that it contains manifest.json and that the manifest name is YouTube Digest. If verification fails, stop and ask me to open the extracted YouTube Digest project folder in my coding agent. Do not search other folders, edit a guessed copy, assume an installation path, or claim Chrome can reveal the absolute OS source path. Update the provider's API endpoint, request format, and minimum Chrome host permissions. Preserve bring-your-own-key and local Chrome storage. Never put API keys in source code, commits, logs, screenshots, this prompt, or chat; after the code is ready, tell me where to enter the key myself. Keep DeepSeek-only request fields and retry behavior isolated to DeepSeek. Handle provider-specific rules separately so one provider does not affect another. Update README.md, README.zh-CN.md, PRIVACY.md, SECURITY.md, and tests. Run npm test, npm run check, and npm run package. Then explain how to reload the unpacked extension and test it on a real YouTube video.`;
  assert.ok(optionsPage.includes(`>${customizationPrompt}</textarea>`));
  assert.doesNotMatch(customizationPrompt, /Documents|USERPROFILE/);


});

test("notes filters preserve selected contrast and expose pressed state", () => {
  const html = read("sidepanel.html");
  const css = read("sidepanel.css");
  const js = read("src/panel/main.js");

  assert.match(
    html,
    /id="notesFilterThis"[\s\S]*?aria-pressed="true"[\s\S]*?>[\s\S]*?This Video/,
  );
  assert.match(
    html,
    /id="notesFilterAll"[\s\S]*?aria-pressed="false"[\s\S]*?>[\s\S]*?All Notes/,
  );
  assert.match(
    css,
    /\.notes-filter \.enhance-btn\.active:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--accent-hover\);[^}]*color:\s*white;/,
  );
  assert.match(
    css,
    /\.notes-filter \.enhance-btn:hover:not\(:disabled\)\s*\{[^}]*background:\s*transparent;[^}]*color:\s*var\(--text-secondary\);/,
  );
  assert.match(css, /\.notes-filter \.enhance-btn:focus-visible\s*\{[^}]*outline:/);
  assert.match(js, /setNotesFilter\(false\)/);
  assert.match(js, /setNotesFilter\(true\)/);
  assert.match(js, /setAttribute\("aria-pressed", String\(!showAll\)\)/);
  assert.match(js, /setAttribute\("aria-pressed", String\(showAll\)\)/);
});

test("runtime has no source-file credential dependency or retired model", () => {
  const runtime = [
    "background.js",
    "content.js",
    "sidepanel.js",
    "options.js",
    "settings.js",
    "src/core/debug.js",
    "src/core/json.js",
    "src/core/markup.js",
    "src/core/timestamps.js",
    "src/core/transcript.js",
    "src/core/translation-validation.js",
    "src/core/urls.js",
    "src/core/chat-data.js",
    "src/core/summary.js",
    "src/platform/browser.js",
    "src/platform/messaging.js",
    "src/platform/sidepanel.js",
    "src/platform/storage.js",
    "src/services/ai-client.js",
    "src/services/ai-tasks.js",
    "src/services/prompts.js",
    "src/services/supadata.js",
    "src/background/main.js",
    "src/background/notes.js",
    "src/background/panel-scope.js",
    "src/background/router.js",
    "src/background/video-info.js",
    "src/content/digest-button.js",
    "src/content/main.js",
    "src/content/note-button.js",
    "src/content/page.js",
    "src/panel/cache.js",
    "src/panel/digest.js",
    "src/panel/explain.js",
    "src/panel/main.js",
    "src/panel/notes.js",
    "src/panel/playback.js",
    "src/panel/state.js",
    "src/panel/translation.js",
    "src/panel/utils.js",
    "src/panel/video.js",
    "src/panel/views.js",
    "src/panel/chat.js",
    "src/panel/summary.js",
    "src/options/i18n.js",
    "src/options/main.js",
    "src/options/storage.js",
  ]
    .map(read)
    .join("\n");

  assert.doesNotMatch(runtime, /\bCONFIG\./);
  assert.doesNotMatch(runtime, /importScripts\(["']config\.js/);
  assert.doesNotMatch(runtime, /\bdeepseek-chat\b/);
  assert.match(runtime, /deepseek-v4-flash/);
});

test("retired Remix and reader files are absent", () => {
  for (const file of [
    "reader.html",
    "reader.js",
    "remix-prompts.js",
    "config.example.js",
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
  }
});

test("published prompt files contain runtime sections", () => {
  const expectedSections = {
    "prompts/analysis.md": ["System prompt", "User prompt"],
    "prompts/chat.md": ["System prompt"],
    "prompts/explain.md": ["System prompt", "User prompt"],
    "prompts/note-cleanup.md": ["System prompt", "User prompt"],
    "prompts/translation.md": [
      "Shared base rules",
      "Chinese rules",
      "Transcript batch translation",
    ],
  };

  for (const [file, sections] of Object.entries(expectedSections)) {
    const markdown = read(file);
    for (const section of sections) {
      assert.match(markdown, new RegExp(`^## ${section}$`, "m"));
    }
  }
});
