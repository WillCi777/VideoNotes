# Privacy

Effective: October 30, 2026. This policy describes this local PC adaptation.

There is no developer-operated backend, telemetry or account service in this extension. Data is stored in Chrome local extension storage, which is not an encrypted password vault.

## External processing

- Bilibili URLs are normalized to BV ID and part number. The extension contacts api.bilibili.com for video metadata, WBI request parameters and subtitle tracks. Existing browser login cookies may be included only in those API requests. It does not export or ask users to paste cookies. Subtitle files are fetched without credentials from the explicitly permitted aisubtitle.hdslb.com or i0.hdslb.com hosts. Redirects are rejected.
- YouTube canonical URLs and the user's Supadata API key are sent to api.supadata.ai for native subtitles. No audio transcription is requested.
- The selected AI provider receives transcript text and relevant video metadata for summaries; selected text and context for explanations; requested text for translations; recent conversation messages, current notes and the full transcript or selected excerpts for video discussion and revision; and note context when the original YouTube note-polishing path is used. Providers include DeepSeek, OpenAI and Google Gemini. A custom HTTPS endpoint receives its own configured key and submitted content, subject to Chrome host permissions. The developer does not proxy these calls.
- Imported files are read locally. Their text is sent to the selected AI provider when the user selects import and summarize. No file/audio upload service is included.
- These services may charge for usage and retain content under their own policies. Clearing local data does not delete their retained data.

## Local retention and deletion

Settings and API keys remain until reset or extension removal. Transcript and summary history is limited to 20 entries, expires after 30 days when loaded or cleaned, and has an approximate 6 MiB cache budget. Saved notes are capped at 100, with oldest entries removed on insertion. Chats are capped at 50 conversations; message size and count within those conversations can still consume browser storage. Users may export summaries before cache eviction.

Each video history entry also contains up to 40 discussion messages, a pending revision and at most one previous note version. Requests include the last 12 messages (up to 4000 characters each), current notes and full subtitles up to 80000 characters; longer chat sources use explicitly disclosed excerpts, and full revision is refused. Each history row can be deleted. Clear history removes transcript/summary entries including their discussions, pending revisions and previous versions; API settings, legacy separate notes and legacy chats remain. Delete notes/chats in their respective interfaces. Use the Settings reset-all action or remove the extension to remove all local extension data. Revoking API keys is handled by the provider.

## Browser permissions

The action opens a local extension reader tab; legacy sidePanel permission remains for compatibility; storage persists local data; tabs finds the active page and matching video tabs; scripting controls the Bilibili HTML video player on a matching video page and reads YouTube player metadata. Host permissions are limited to the listed video, subtitle and AI domains in manifest.json. The side panel is available on other pages for link input; it does not inject content scripts there. YouTube retains its original content script controls. There is no cookies, downloads or general all-sites host permission.

Reader URLs include a local record identifier and, when relevant, the canonical video URL. They may be bookmarked in the browser; imported transcript text and API keys are never placed in the URL. Existing cached records restore without a model call. Legacy notes and chat tabs remain hidden. A video-specific discussion panel is available in the reader; a response does not change notes until a revision is explicitly applied. Jobs require the reader tab to remain open. There is no mobile access, cloud synchronization, audio transcription or visual video analysis.
