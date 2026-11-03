const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// The four extension contexts and the exact module load order each one uses.
// These must stay in sync with manifest.json, background.js, sidepanel.html,
// and options.html.
const CONTEXTS = {
  background: [
    "settings.js",
    "src/core/local-video.js",
    "src/core/wbi.js",
    "src/core/discussion.js",
    "src/core/debug.js",
    "src/core/json.js",
    "src/core/timestamps.js",
    "src/core/translation-validation.js",
    "src/platform/browser.js",
    "src/platform/storage.js",
    "src/platform/sidepanel.js",
    "src/services/prompts.js",
    "src/services/supadata.js",
    "src/services/bilibili.js",
    "src/services/ai-client.js",
    "src/services/ai-tasks.js",
    "src/services/discussion.js",
    "src/background/panel-scope.js",
    "src/background/notes.js",
    "src/background/video-info.js",
    "src/background/router.js",
    "src/background/main.js",
  ],
  content: [
    "src/core/debug.js",
    "src/content/digest-button.js",
    "src/content/note-button.js",
    "src/content/page.js",
    "src/content/main.js",
    "content.js",
  ],
  panel: [
    "settings.js",
    "src/core/debug.js",
    "src/core/urls.js",
    "src/core/local-video.js",
    "src/core/transcript.js",
    "src/core/markup.js",
    "src/core/translation-validation.js",
    "src/core/chat-data.js",
    "src/core/summary.js",
    "src/platform/browser.js",
    "src/platform/messaging.js",
    "src/panel/state.js",
    "src/panel/utils.js",
    "src/panel/video.js",
    "src/panel/cache.js",
    "src/panel/views.js",
    "src/panel/notes.js",
    "src/panel/translation.js",
    "src/panel/playback.js",
    "src/panel/explain.js",
    "src/panel/digest.js",
    "src/panel/chat.js",
    "src/panel/summary.js",
    "src/panel/discussion.js",
    "src/panel/local.js",
    "src/panel/main.js",
    "sidepanel.js",
  ],
  options: [
    "settings.js",
    "src/options/i18n.js",
    "src/options/storage.js",
    "src/options/main.js",
    "options.js",
  ],
};

function listSrcModules() {
  const modules = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".js")) modules.push(rel);
    }
  };
  walk("src");
  return modules.sort();
}

test("every src module is referenced by a context loader", () => {
  const referenced = new Set(
    Object.values(CONTEXTS).flat().filter((file) => file.startsWith("src/")),
  );
  const unreferenced = listSrcModules().filter((file) => !referenced.has(file));
  assert.deepEqual(unreferenced, [], "unreferenced src modules must not exist");
});

test("loader files reference exactly the modules each context loads", () => {
  const manifest = JSON.parse(read("manifest.json"));
  const contentJs = manifest.content_scripts?.[0]?.js || [];
  assert.deepEqual(contentJs, CONTEXTS.content);

  const panelScripts = [...read("sidepanel.html").matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map((match) => match[1]);
  assert.deepEqual(panelScripts, CONTEXTS.panel);

  const optionsScripts = [...read("options.html").matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map((match) => match[1]);
  assert.deepEqual(optionsScripts, CONTEXTS.options);

  // background.js must reference every background module (in its module array
  // and its importScripts call) and support both loader paths.
  const backgroundSource = read("background.js");
  const pathStrings = new Set(
    [...backgroundSource.matchAll(/"((?:settings\.js|src\/[^"]+))"/g)].map(
      (match) => match[1],
    ),
  );
  for (const file of CONTEXTS.background) {
    assert.ok(
      pathStrings.has(file),
      `background.js must reference ${file}`,
    );
  }
  assert.match(backgroundSource, /typeof importScripts === "function"/);
  assert.match(backgroundSource, /document\.write/);
});

test("every src module is in the release allowlist", () => {
  const allowlistSource = read("scripts/check-release.sh");
  const block = allowlistSource.match(/public_allowlist=\(([\s\S]*?)\)\n\nrequired_public_files/);
  assert.ok(block, "expected the public_allowlist block");
  const allowlisted = new Set(
    [...block[1].matchAll(/^\s*"([^"]+)"/gm)].map((match) => match[1]),
  );
  for (const file of listSrcModules()) {
    assert.ok(allowlisted.has(file), `src module missing from allowlist: ${file}`);
  }
  assert.ok(allowlisted.has("manifest.safari.json"));
});

test("no context redeclares a top-level let or const binding", () => {
  for (const [contextName, files] of Object.entries(CONTEXTS)) {
    const declarations = new Map();
    for (const file of files) {
      if (!fs.existsSync(path.join(root, file))) continue;
      for (const match of read(file).matchAll(/^(?:let|const)\s+([A-Za-z_$][\w$]*)\s*=/gm)) {
        const name = match[1];
        if (!declarations.has(name)) declarations.set(name, []);
        declarations.get(name).push(file);
      }
    }
    const duplicates = [...declarations.entries()].filter(([, files]) => files.length > 1);
    assert.deepEqual(
      duplicates,
      [],
      `top-level let/const redeclared in ${contextName} context`,
    );
  }
});

test("Safari manifest drops Chrome-only keys and uses a scripts background", () => {
  const safari = JSON.parse(read("manifest.safari.json"));
  assert.equal(safari.manifest_version, 3);
  assert.equal(safari.name, "VideoNotes");
  assert.equal(safari.version, "2.1.0");
  assert.ok(Array.isArray(safari.background?.scripts));
  assert.equal(Object.hasOwn(safari, "side_panel"), false);
  assert.equal(Object.hasOwn(safari, "minimum_chrome_version"), false);
  assert.equal(safari.permissions.includes("sidePanel"), false);
  assert.deepEqual(safari.content_scripts?.[0]?.js, CONTEXTS.content);
});

test("platform layer exposes the browser compatibility surface", () => {
  const browserSource = read("src/platform/browser.js");
  const sidepanelSource = read("src/platform/sidepanel.js");
  const storageSource = read("src/platform/storage.js");
  assert.match(browserSource, /function ytdBrowserApi\(\)/);
  assert.match(browserSource, /function ytdAliasBrowserNamespace\(\)/);
  assert.match(browserSource, /function ytdSupportsSidePanel\(\)/);
  assert.match(sidepanelSource, /function ytdOpenSidePanelFallback\(\)/);
  assert.match(sidepanelSource, /function ytdSetPanelForTab\([^)]*\)/);
  assert.match(storageSource, /setAccessLevel/);
});
