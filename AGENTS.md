# if.team CLI — Agent Rules

> Companion docs: [COMMANDS.md](./COMMANDS.md) (full command reference), [CODEBASE.md](./CODEBASE.md) (repo map), [docs/auth.md](./docs/auth.md) (auth model), [docs/patterns.md](./docs/patterns.md) (command patterns). Read those before changing code in their area.
>
> Mirrors [Doist/todoist-cli](https://github.com/Doist/todoist-cli) — check that repo when a pattern isn't covered here.

## Project

`if-team-cli` is a TypeScript CLI for [if.team](https://if.team) — an all-in-one ERP. Binary: `if-team`.

ESM-only · Node ≥ 24 · Commander 14 · vitest · TypeScript 6.

## Build & run

```bash
npm install              # install deps
npm run build            # tsc -p tsconfig.build.json → dist/
npm run dev              # watch mode
npm run type-check       # type-check, no emit
npm test                 # vitest
node dist/index.js …     # run the CLI (no linking needed)
```

**Two-tsconfig setup:** `tsconfig.json` includes source + tests (IDE / type-check); `tsconfig.build.json` excludes `*.test.ts` (build / dev).

## Rules

- **Filenames:** kebab-case. No barrel files except per-group `index.ts`.
- **Commands:** see [docs/patterns.md](./docs/patterns.md) for list/show + create/update/delete patterns, the `--data` blend, confirmation prompts, and the Commander negation gotcha.
- **Auth:** see [docs/auth.md](./docs/auth.md). Two-tier system (API key vs Bearer JWT). `apiRequest()` auto-injects `company_id` and refreshes expired JWTs.
- **Errors:** throw `CliError(code, message, hints?)` from `src/lib/errors.ts`. Never call `process.exit()` in handlers — the global `parseAsync().catch` in `src/index.ts` routes to the right formatter (pretty / JSON).
  ```typescript
  throw new CliError('NOT_FOUND', `Task "${ref}" not found.`, [
      'Use `if-team task list` to see available tasks.',
  ])
  ```
- **HTTP errors:** `apiRequest()` flattens 422 `errors` maps into `CliError` hints and throws `CliError('NOT_FOUND', …)` on HTTP 404. Catch by `err.code === 'NOT_FOUND'` — don't regex the message (locale-fragile).
- **Output:** always call `isJsonMode()` / `isNdjsonMode()` / `isQuietMode()` from `src/lib/global-args.ts` before printing human-readable text. `printSuccess()` is silent under `--quiet`; create commands fall back to bare `console.log(res.id)` so the ID stays pipeable.
- **API base URL:** `https://api.demo.if.team` (default). Override with `IF_TEAM_API_URL`. Spec: `docs/api-spec.json`.
- **Logs:** `apiRequest` writes request/response lines at verbosity ≥ 2 (`-vv`); body at ≥ 3 (`-vvv`). Use this for manual QA verification — don't add ad-hoc `console.log`.

## Editing the agent skill

`skills/if-team-cli/SKILL.md` is **generated** from `src/lib/skills/content.ts` — never edit the `.md` directly, your changes will be overwritten on the next `npm run sync:skill` and CI will fail `check:skill-sync`.

To change anything in the installed skill:

1. Edit the `SKILL_CONTENT` template literal in `src/lib/skills/content.ts` (frontmatter fields — name / description / compatibility / author — live as separate exports above it).
2. Run `npm run sync:skill` to regenerate `skills/if-team-cli/SKILL.md`.
3. Commit both files together. `npm run check:skill-sync` runs in CI and refuses drift.

The same `generateSkillFile()` function is used at install time, so anything installed via `if-team skill install <agent>` matches what's in the repo.

## Testing

vitest. Co-locate `*.test.ts` next to the module it covers. Run `npm test` before committing.

**Live-API smoke tests** (`*.int.test.ts`) hit the real API and are gated with `describe.skipIf` on these env vars — unset by default, so CI and local `npm test` skip them:

```bash
export IF_TEAM_INT_TOKEN=…          # Bearer JWT (not API key)
export IF_TEAM_INT_COMPANY_ID=
export IF_TEAM_INT_USER_ID=    # optional, enables --assignee checks
npm test -- list.int.test
```

## API spec updates

`docs/api-spec.json` (OpenAPI 3.0) is the authoritative reference for request/response shapes. A daily GitHub Action (`check-api-spec.yml`) diffs the live spec against the stored version and opens a PR on `chore/update-api-spec` if it changed. Manual refresh:

```bash
curl -s https://api.demo.if.team/api-json -o docs/api-spec.json
```
