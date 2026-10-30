# Architecture

## Runtime

A Manifest V3 extension using classic scripts. There is no bundler, server, package install hook or npm runtime dependency. Preserve module order in `background.js`, `sidepanel.html` and `manifest.json`; exact loader contracts are checked in `tests/architecture.test.js`.

- `src/core/`: pure URL/input boundaries, WBI protocol checksum, subtitle normalization, safe markup, timestamp/schema normalization, export and discussion-context selection.
- `src/platform/`: browser API abstraction, local storage, message timeout watchdog and legacy side-panel compatibility.
- `src/services/`: native transcript providers, provider-specific AI requests, prompt loading, extraction and dedicated video discussion/revision service.
- `src/background/`: trusted extension message routing, action opening the reader, video metadata and legacy note services.
- `src/panel/`: reader state, explicit local jobs, history, renderers, translation, exports and discussion UI.
- `src/options/`: provider/key settings, language copy and reset controls.

## Main flows

Link → strict platform/part parse → cached record or background transcript request → normalized timestamped text → AI analysis → schema validation → safe rendering → local cache.

Bilibili requests metadata, public WBI parameters, the signed subtitle-track endpoint and an allowlisted subtitle file. Existing browser credentials may be included only for Bilibili API requests; subtitle CDN fetches omit credentials and reject redirects. No cookies permission or cookie export is used. WBI MD5 is a request checksum, not a password or authorization mechanism.

YouTube uses Supadata native mode only. Imported files/text bypass platform retrieval. Plain text has no valid playback timestamps.

Discussion → trusted reader-only message → bounded roles/history + source context + current notes → provider. Normal replies are separate from notes. Revision output is normalized into the same analysis schema, previewed, then explicitly applied. The UI retains a previous version and rolls back in-memory replacement if saving fails.

## Persistence and boundaries

- Settings: `ytd_settings` (API keys stay here, never in record URLs).
- History: `digest_<video key>`, with transcript, metadata, analysis, per-video discussion, pending revision and one previous note version.
- Video keys distinguish platform and Bilibili part; imports use content hashes.
- Legacy separate notes/chat data remains separate and is not exposed through the new discussion panel.
- Reader hashes contain record identifiers/canonical URLs, not transcripts or credentials.
- Source and model output are untrusted data. Render text safely; only exact source timestamps become discussion citation buttons.
- A generation counter and busy flags prevent same-page job changes from mixing video results. Independent reader tabs are not a collaborative editing system; avoid editing the same record concurrently.

## Release

`scripts/check-release.sh` checks manifest references, script syntax, tests and credential patterns. `scripts/package-extension.sh` obtains an explicit public-file allowlist from that check and produces only the extension/documentation ZIP. Source tests, CI and developer docs remain in the Git repository, not the install ZIP. Tag releases run the same checks before uploading the ZIP and checksum through GitHub Actions.
