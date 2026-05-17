# Contributing to nuxt-processor

Thank you for your interest in contributing! This document explains how to get
involved. By participating, you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Where GitHub looks for these files

GitHub’s [community profile](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)
checks the **repository root** for:

| File | Purpose |
| --- | --- |
| `CONTRIBUTING.md` | How to contribute (this file) |
| `CODE_OF_CONDUCT.md` | Community standards |

Optional but recommended in `.github/`: issue templates, pull request template,
and `SECURITY.md` for security reports.

## Ways to contribute

- **Bug reports** — open an issue with reproduction steps, Nuxt version, and Redis setup.
- **Feature requests** — open an issue describing the use case before large PRs.
- **Documentation** — fixes and clarifications in `README.md`, `docs/`, and `changelog.md`.
- **Code** — bug fixes, tests, and features via pull request.

## Development setup

Requirements: **Node.js 24.x** (see `.nvmrc`), **npm**, and **Redis** for manual playground testing.

```bash
git clone https://github.com/aidanhibbard/nuxt-processor.git
cd nuxt-processor
npm install
npm run dev:prepare
```

### Playground

```bash
# Nuxt app + hot reload
npm run dev

# Production build of the playground
npm run dev:build
```

Workers run in a separate process (see README). From the playground directory after `npm run dev`:

```bash
npm run processor:dev
```

### Quality checks

Run these before opening a PR:

```bash
npm run lint          # ESLint
npm run typecheck     # Nuxt / TypeScript
npm run test          # Vitest
npm run ci            # lint + typecheck + test
```

Optional (requires Docker):

```bash
npm run test:docker   # runtime NUXT_REDIS_* smoke tests
```

### Docs site

```bash
npm run vp:dev
npm run vp:build
```

## Pull request process

1. Fork the repo and create a branch from `main`.
2. Make focused changes; avoid unrelated drive-by edits.
3. Add or update tests in `spec/` when changing runtime behaviour.
4. Update `docs/` or `README.md` when behaviour or public API changes.
5. Ensure `npm run ci` passes.
6. Open a PR against `main` and fill out the [PR template](.github/pull_request_template.md).

Breaking changes should be called out in the PR description and documented in
`changelog.md` under an `## Unreleased` or upcoming version section.

## Project layout

| Path | Description |
| --- | --- |
| `src/module.ts` | Nuxt module entry |
| `src/runtime/` | `defineQueue`, `defineWorker`, `useProcessor` |
| `src/utils/` | Build-time helpers (workers entry, Redis config) |
| `playground/` | Development app |
| `docs/` | VitePress documentation |
| `spec/` | Vitest unit tests |
| `scripts/` | Docker smoke and release helpers |

## Commit messages

Use clear, imperative subject lines (e.g. `fix: resolve Redis port from NUXT_*`).
Conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`) are welcome but not
required.

## Releases

Maintainers handle releases. **Contributors do not need to publish to npm.**

- Stable: version bump + `npm publish` (see maintainer docs).
- Beta: `npm publish --tag beta` — install with `nuxt-processor@beta`.

## Questions

Open a [GitHub Discussion](https://github.com/aidanhibbard/nuxt-processor/discussions)
or issue if Discussions are not enabled. For conduct concerns, see
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
