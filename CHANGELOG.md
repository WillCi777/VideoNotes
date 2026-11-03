# Changelog

## 2.1.0 - 2026-11-03

- Rebrand the maintained tool as VideoNotes（视频笔记）.
- Update extension display name, settings, generated document attribution, README and package assets.
- Preserve existing browser storage identifiers and original MIT attribution for upgrade compatibility.


## 2.0.0 - 2026-10-30

First shareable local-enhancement release, based on upstream 1.1.5.

### Added

- Bilibili BV and part-aware native subtitle retrieval with WBI request signing.
- Explicit video-link input and bounded SRT/VTT/TXT/plain-text imports.
- Full-page reader with bookmarkable local record URLs, history restoration and exports.
- Topic-led extraction: goals, key points, reusable workflow, example-specific decisions, outcomes and uncertainties.
- Video-specific discussion grounded in current subtitles and notes, with valid timestamp citations.
- Revision preview, explicit apply, one-version restore and local per-video conversation persistence.
- Input/host validation, bounded subtitle responses and discussion context, source-scope disclosure for long transcripts.
- Automated core/service checks and optional mocked browser integration coverage.

### Changed

- Extension icon opens a reader tab instead of the side panel.
- Only the chosen AI provider needs an AI key; Bilibili and imports do not require Supadata.
- Legacy independent notes/chat tabs are hidden; existing data is not intentionally migrated or deleted.
- Public docs now describe this edition rather than the original YouTube-only workflow.

### Known limits

- No mobile, Douyin, speech transcription or video-frame understanding.
- Bilibili subtitle coverage depends on platform availability and login/cookie restrictions.
- AI quality depends on source text and provider; service limits and costs are provider-specific.
- Cached history can expire or be evicted; local record links work only where their local data exists.
