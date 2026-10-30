# YouTube Digest Local

A desktop Chrome extension that turns Bilibili and YouTube subtitles into topic-led study notes, with a local reading page and a video-specific discussion/revision panel.

[中文](README.md) · [Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md)

## Install

Requires desktop Chrome 116+. No Node.js or build step is required for installation.

1. Download the extension ZIP from this repository's Releases page, when available, or use Code → Download ZIP.
2. Extract it into a permanent directory. Open `chrome://extensions` and enable Developer mode.
3. Choose Load unpacked and select the directory containing `manifest.json`.
4. Click the extension icon. In Settings, choose an AI provider and enter your own API key.
5. Paste a complete Bilibili BV or YouTube watch URL and generate notes. YouTube additionally requires a Supadata key; Bilibili does not.

Keep the installation directory in place. Update its files, reload the extension, and refresh reader tabs. Export important notes before upgrading or uninstalling.

## Features

- Bilibili BV videos and individual parts; standard YouTube videos.
- SRT/VTT/TXT imports and pasted text.
- Goals, key points, reusable workflows, example-specific choices, chapter details and timestamps.
- Discussion grounded in the current transcript and notes. Replies do not change notes automatically.
- Preview a full revision, explicitly apply it, and restore one previous version.
- Local history and Markdown/transcript/mindmap-outline exports.

Use DeepSeek, OpenAI or Google Gemini with your own API account. Custom HTTPS providers require matching browser host permissions, which this version does not request dynamically. API use can incur charges; the project provides no included credits.

## Data and limitations

There is no project-operated backend, analytics or cloud synchronization. Settings and history live in browser extension storage, which is not an encrypted vault. Subtitle retrieval contacts the corresponding platform or Supadata; AI features send text to the selected provider. This is not fully offline software. See [PRIVACY.md](PRIVACY.md).

History is capped at 20 videos, expires after 30 days, and has an approximate 6 MiB cache budget. Discussions and revision versions are stored with their history entry. Up to 40 messages are retained locally, with the most recent 12 sent in requests. Long-source discussions disclose when only excerpts are used; full revision of sources over 80000 characters is refused.

No mobile, Douyin, audio transcription, video-frame understanding or access-control bypass is included. Subtitle availability varies with the video, login state and platform restrictions. Import text when retrieval fails. Keep the reader open during processing. The Safari manifest is retained from upstream but is not the supported release target for this edition.

## Develop

Plain HTML/CSS/JavaScript with no npm runtime dependencies. Node.js 22+ is recommended for checks; packaging also requires Bash, zip and unzip.

```sh
npm test
npm run check
npm run package
```

The allowlisted extension ZIP is created under `dist/`. Optional browser smoke tests require Playwright and a local Chrome executable; details are in [CONTRIBUTING.md](CONTRIBUTING.md). Automated browser/API tests use mocks, not a guarantee of live provider availability.

## Credits

Derived from [WillCi777/youtube-digest-Next](https://github.com/WillCi777/youtube-digest-Next), whose upstream documentation also references [bty2403/youtube-digest-Next](https://github.com/bty2403/youtube-digest-Next). Original MIT copyright notices are retained. See [LICENSE](LICENSE). This is not an official product of the video platforms or AI providers.
