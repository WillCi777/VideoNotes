/**
 * OPTIONS — MAIN WIRING
 *
 * Boots the options page: language switching, settings load/save, the
 * customization prompt, and the local-data management buttons. Depends on
 * the I18N and STORAGE modules above it.
 */
(function (global) {
  "use strict";

  function i18nModule() {
    if (typeof module !== "undefined" && module.exports) {
      return require("./i18n.js");
    }
    return global.YTD?.options?.i18n;
  }

  function storageModule() {
    if (typeof module !== "undefined" && module.exports) {
      return require("./storage.js");
    }
    return global.YTD?.options?.storage;
  }

  async function copyPromptValue(clipboard, value) {
    await clipboard.writeText(value);
  }

  function getSafeLocalStorage(root) {
    try {
      return root.localStorage;
    } catch (_error) {
      return null;
    }
  }

  function initialize(root = global) {
    const i18n = i18nModule();
    const storageApi = storageModule();
    const doc = root.document;
    const settingsApi = root.YTD_SETTINGS;
    if (!doc || !settingsApi) return;

    const storage = storageApi.createStorageAdapter(
      root.chrome,
      getSafeLocalStorage(root),
    );
    const form = doc.getElementById("settingsForm");
    const aiApiKeyInput = doc.getElementById("aiApiKey");
    const aiModelInput = doc.getElementById("aiModel");
    const openaiApiKeyInput = doc.getElementById("openaiApiKey");
    const openaiModelInput = doc.getElementById("openaiModel");
    const geminiApiKeyInput = doc.getElementById("geminiApiKey");
    const geminiModelInput = doc.getElementById("geminiModel");
    const supadataApiKeyInput = doc.getElementById("supadataApiKey");
    const customizationPrompt = doc.getElementById("customizationPrompt");
    const copyCustomizationPromptBtn = doc.getElementById(
      "copyCustomizationPromptBtn",
    );
    const copyStatus = doc.getElementById("copyStatus");
    const saveStatus = doc.getElementById("saveStatus");
    const dataStatus = doc.getElementById("dataStatus");
    const languageButtons = [...doc.querySelectorAll("[data-language]")];
    const providerButtons = [...doc.querySelectorAll("[data-provider]")];
    const providerFields = [...doc.querySelectorAll("[data-provider-fields]")];
    const statusStates = new Map();
    const promptDrafts = i18n.createPromptDrafts();
    let currentLanguage = "en";
    let currentProvider = settingsApi.DEFAULTS.provider;

    function applyProvider(provider) {
      currentProvider = provider;
      for (const button of providerButtons) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.provider === provider),
        );
      }
      for (const field of providerFields) {
        field.style.display =
          field.dataset.providerFields === provider ? "block" : "none";
      }
    }

    function renderStatus(element) {
      const state = statusStates.get(element);
      element.textContent = state
        ? i18n.translate(currentLanguage, state.key, state.params)
        : "";
    }

    function setStatus(element, key, params = {}) {
      statusStates.set(element, { key, params });
      renderStatus(element);
    }

    function applyLanguage(language) {
      const nextDraft = i18n.switchPromptDraft(
        promptDrafts,
        currentLanguage,
        language,
        customizationPrompt.value,
      );
      currentLanguage = nextDraft.language;
      doc.documentElement.lang = currentLanguage;
      doc.title = i18n.translate(currentLanguage, "pageTitle");

      for (const element of doc.querySelectorAll("[data-i18n]")) {
        element.textContent = i18n.translate(
          currentLanguage,
          element.dataset.i18n,
        );
      }
      for (const element of doc.querySelectorAll("[data-i18n-html]")) {
        element.innerHTML = i18n.translate(
          currentLanguage,
          element.dataset.i18nHtml,
        );
      }
      for (const element of doc.querySelectorAll("[data-i18n-aria-label]")) {
        element.setAttribute(
          "aria-label",
          i18n.translate(currentLanguage, element.dataset.i18nAriaLabel),
        );
      }

      i18n.updateLocalizedPrompt(
        customizationPrompt,
        nextDraft.prompt,
      );
      i18n.updateLanguageButtonState(languageButtons, currentLanguage);
      for (const element of statusStates.keys()) renderStatus(element);
    }

    async function loadSettings() {
      try {
        const stored = await storage.get(settingsApi.STORAGE_KEY);
        const migration = settingsApi.migrateLegacyCustom(
          stored[settingsApi.STORAGE_KEY],
        );
        const settings = migration.settings;

        aiApiKeyInput.value = settings.aiApiKey;
        aiModelInput.value = settings.aiModel;
        openaiApiKeyInput.value = settings.openaiApiKey;
        openaiModelInput.value = settings.openaiModel;
        geminiApiKeyInput.value = settings.geminiApiKey;
        geminiModelInput.value = settings.geminiModel;
        supadataApiKeyInput.value = settings.supadataApiKey;
        applyProvider(settings.provider);
        if (migration.migrated) {
          await storage.set({ [settingsApi.STORAGE_KEY]: settings });
          setStatus(saveStatus, "migrationWarning");
        }
      } catch (_error) {
        setStatus(saveStatus, "settingsLoadFailed");
      }
    }

    async function loadOptions() {
      try {
        applyLanguage(await storageApi.readPreferredLanguage(storage));
      } catch (_error) {
        applyLanguage("en");
      }
      await loadSettings();
    }

    async function saveSettings(event) {
      event.preventDefault();
      setStatus(saveStatus, "saving");

      const settings = settingsApi.normalize({
        provider: currentProvider,
        aiApiKey: aiApiKeyInput.value,
        aiModel: aiModelInput.value,
        openaiApiKey: openaiApiKeyInput.value,
        openaiModel: openaiModelInput.value,
        geminiApiKey: geminiApiKeyInput.value,
        geminiModel: geminiModelInput.value,
        supadataApiKey: supadataApiKeyInput.value,
      });

      if (!settings.supadataApiKey) {
        setStatus(saveStatus, "addSupadataKey");
        return;
      }
      if (!settingsApi.activeAiKey(settings)) {
        // The active provider's key is required; reuse the DeepSeek message
        // copy as a generic prompt to open Settings.
        setStatus(saveStatus, "addDeepseekKey");
        return;
      }

      try {
        await storage.set({ [settingsApi.STORAGE_KEY]: settings });
        setStatus(saveStatus, "saved");
      } catch (_error) {
        setStatus(saveStatus, "saveFailed");
      }
    }

    async function copyCustomizationPrompt() {
      setStatus(copyStatus, "copying");
      try {
        await copyPromptValue(
          root.navigator.clipboard,
          customizationPrompt.value,
        );
        setStatus(copyStatus, "promptCopied");
      } catch (_error) {
        setStatus(copyStatus, "copyFailed");
      }
    }

    async function clearCachedDigests() {
      const all = await storage.get(null);
      const keys = Object.keys(all).filter((key) => key.startsWith("digest_"));
      if (keys.length) await storage.remove(keys);
      setStatus(dataStatus, "clearedDigests", { count: keys.length });
    }

    async function clearNotes() {
      await storage.remove("ytd_notes");
      setStatus(dataStatus, "notesDeleted");
    }

    async function resetAllData() {
      const confirmed = root.confirm(
        i18n.translate(currentLanguage, "resetConfirm"),
      );
      if (!confirmed) return;

      await storage.clear();
      await storageApi.persistPreferredLanguage(storage, currentLanguage);
      await loadSettings();
      setStatus(dataStatus, "allDataDeleted");
    }

    form.addEventListener("submit", saveSettings);
    copyCustomizationPromptBtn.addEventListener(
      "click",
      copyCustomizationPrompt,
    );
    doc
      .getElementById("clearCacheBtn")
      .addEventListener("click", clearCachedDigests);
    doc.getElementById("clearNotesBtn").addEventListener("click", clearNotes);
    doc.getElementById("resetBtn").addEventListener("click", resetAllData);
    for (const button of languageButtons) {
      button.addEventListener("click", async () => {
        const language = button.dataset.language;
        applyLanguage(language);
        await storageApi.persistPreferredLanguage(storage, language);
      });
    }
    for (const button of providerButtons) {
      button.addEventListener("click", () => {
        applyProvider(button.dataset.provider);
      });
    }

    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", loadOptions, { once: true });
    } else {
      void loadOptions();
    }
  }

  const api = {
    copyPromptValue,
    initialize,
  };

  global.YTD = global.YTD || {};
  global.YTD.options = global.YTD.options || {};
  global.YTD.options.main = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
