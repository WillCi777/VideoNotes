# Contributing

Use a branch and submit a pull request to this repository for fixes or improvements. Keep upstream MIT attribution intact. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in public issues.

## Local checks

Use Node.js 22+ and a shell with Bash, zip and unzip. There are no npm dependencies to install for the standard suite.

```sh
npm test
npm run check
npm run package
```

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing module loading or cache shape. Add meaningful behavioral coverage for platform parsing, provider handling, context boundaries and revision persistence; do not encode marketing copy or prices as tests.

## Optional browser smoke test

`tests/browser-smoke.cjs` launches an isolated headless Chrome profile with mocked Chrome APIs and mocked network services. It does not use your logged-in profile or real API keys. Install Playwright in your development environment if needed, then run:

```sh
node tests/browser-smoke.cjs
```

Set `PLAYWRIGHT_MODULE` to an absolute Playwright module path when it is not in normal module resolution. Set `CHROME_EXECUTABLE` to your Chrome executable; the default is the standard macOS Chrome path. On Linux use the installed Chrome/Chromium path; on Windows use an available Chrome executable and a compatible shell. The smoke test is optional and not included in the dependency-free Node test suite. Images are written to the operating system temp directory.

Live checks should use public videos and scoped API keys entered only in Settings. Test BV parts, subtitle-unavailable errors, imported text without timing, provider errors, history reload, discussion isolation, revision preview/apply/restore and narrow reader layout. Do not commit transcripts, personal browser files, keys or screenshots with private content.

## Release checklist

1. Update manifest/package versions together and add a changelog entry.
2. Run the check and packaging commands; review the ZIP allowlist and license.
3. Publish a version tag such as `v2.0.0` on the intended release commit.
4. The release workflow builds and uploads the matching ZIP and SHA-256 checksum.
5. Check the Actions result and attached assets before sharing a release link.
