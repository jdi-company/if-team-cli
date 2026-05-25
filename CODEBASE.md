# CODEBASE.md — Repo Map

> **Purpose:** a ~2000-token orientation file so Claude (and humans) can navigate
> this repo without exploring. Describes _what is where_; `AGENTS.md` describes
> _how to change things_. Update when structure shifts, not on every new file.

## What this project is

`@jdi/if-team-cli` is a **TypeScript CLI** for [if.team](https://if.team) — an
all-in-one ERP for creative and tech companies. Binary name: `if-team`.

ESM-only · Node ≥ 20.18.1 · Commander 14 · vitest · TypeScript 5.

Repository structure mirrors [Doist/todoist-cli](https://github.com/Doist/todoist-cli).
When a pattern is not yet documented here, check that repo.

## Top-level layout

```
/
├─ src/                   # All source. See tree below.
├─ dist/                  # Build output (tsc). Never edit.
├─ docs/
│  └─ api-spec.json       # OpenAPI 3.0 spec (auto-updated, see GitHub Action)
├─ .github/workflows/
│  └─ check-api-spec.yml  # Daily drift check → opens PR if spec changed
├─ AGENTS.md              # Prescriptive rules (conventions, error handling, JSON flag)
├─ CODEBASE.md            # This file — descriptive map
├─ CLAUDE.md              # One-liner forward to AGENTS.md
├─ tsconfig.json          # Includes src + tests (used by type-check, IDE)
├─ tsconfig.build.json    # Excludes *.test.ts (used by build/dev)
├─ vitest.config.ts       # Test runner config
└─ package.json
```

## `src/` tree

```
src/
├─ index.ts               # Entry: Commander setup, lazy command registry
├─ commands/              # One folder per command group
│  └─ auth/
│     ├─ index.ts         # Registers login / logout / status subcommands
│     ├─ login.ts
│     ├─ logout.ts
│     └─ status.ts
└─ lib/                   # Shared utilities — don't reimplement
   ├─ errors.ts           # CliError(code, message, hints?) + ErrorCode union
   ├─ global-args.ts      # isJsonMode(), isNdjsonMode()
   ├─ logger.ts           # initializeLogger(), log(level, …) — -v verbosity
   ├─ output.ts           # formatError, formatErrorJson, printJson, printNdjson,
   │                      # printSuccess
   └─ spinner.ts          # ora wrapper — startSpinner, stopSpinner,
                          # succeedSpinner, failSpinner
```

## Architecture flow

1. `src/index.ts` sets `program.name('if-team')`, registers global flags
   (`--quiet`, `-v`/`--verbose`, `--no-spinner`), and builds a **lazy command
   registry** — a `Record<name, [description, loader]>`.
2. Placeholder subcommands are registered so `--help` lists everything without
   importing any module.
3. The invoked command name is extracted from `process.argv`; only that
   command's loader runs (`./commands/<name>/index.js`), then the real
   `registerXxxCommand(program)` replaces the placeholder.
4. `program.parseAsync()` runs the action handler. Uncaught `CliError` is
   rendered via `formatError()` (pretty) or `formatErrorJson()` (JSON mode)
   and exits with code 1.

## Command registration pattern

- **Group command** (`auth/`, `task/`, `project/`, …): `index.ts` exports
  `registerXxxCommand(program)`, creates `const cmd = program.command('xxx')`,
  then calls `cmd.command('<sub>')` for each subcommand. Subcommand logic lives
  in sibling files (`login.ts`, `list.ts`, …). Shared helpers go in
  `helpers.ts` within the group folder.
- **Implicit `view` subcommand**: register
  `.command('view [ref]', { isDefault: true })` so `if-team project <ref>`
  dispatches to `if-team project view <ref>`.

## `src/lib/` catalog — don't reimplement

- **`errors.ts`** — `CliError(code, message, hints?, type?)`. Throw for
  anything user-facing. The global `parseAsync().catch` in `src/index.ts`
  routes it to the correct formatter. `ErrorCode` union covers common codes;
  extend it when adding new error states.
- **`output.ts`** — `formatError(err)`, `formatErrorJson(err)`,
  `printJson(data)`, `printNdjson(data)`, `printSuccess(msg)`.
  Use `printJson` for `--json` output, `printSuccess` for human confirmation.
- **`spinner.ts`** — `startSpinner(text)`, `stopSpinner()`,
  `succeedSpinner(text?)`, `failSpinner(text?)`. Spinner is auto-disabled in
  `--json` / `--ndjson` / `--no-spinner` modes.
- **`global-args.ts`** — `isJsonMode()`, `isNdjsonMode()`. Check these before
  printing human-readable output.
- **`logger.ts`** — `initializeLogger()` (called once in `src/index.ts`),
  `log(level, …)` for verbose output (level 1–4 maps to `-v` … `-vvvv`).

## if.team API

- **Base URL:** `https://api.if.team` (override with `IF_TEAM_API_URL` env var)
- **Auth:** Bearer token from `IF_TEAM_TOKEN` env var or stored credentials
- **Spec:** `docs/api-spec.json` — OpenAPI 3.0, 445 endpoints

### Key API domains

| Domain | Base path | Notes |
|---|---|---|
| Auth | `/auth/*` | Login, register, OAuth (Google/Apple), refresh |
| Projects | `/projects/*` | CRUD, Gantt, Kanban, templates, reports |
| Tasks | `/tasks/*` | CRUD, bulk, calendar, workload, Gantt, Kanban |
| Clients | `/clients/*` | CRM clients, custom fields |
| Leads | `/leads/*` | CRM pipeline, kanban, statuses, sources |
| Transactions | `/transactions/*` | Cash flow, P&L, expenses, payments, categories |
| Participants | `/participants/*` | Team members, roles, permissions, rates |
| Workload | `/workload/*` | Time tracking — start, finish, today |
| Chats | `/chats/*` | Project and direct messages |
| Knowledge base | `/knowledge-base/*` | Documents and directories |
| Files | `/files/*` | Upload, storage, sharing |
| Recruitment | `/recruitment/*` | Vacancies, candidates, applications |
| Salaries | `/salaries/*` | Payroll, statuses, change history |
| Webhooks | `/webhooks/*` | CRUD for webhook subscriptions |
| Integrations | `/integrations/*` | ClickUp, HubSpot, Monday.com, bank feeds |

## API Spec management

`docs/api-spec.json` is checked into the repo and kept in sync with the live
API. The GitHub Action `.github/workflows/check-api-spec.yml` runs daily at
08:00 UTC, downloads the spec, and opens a PR on `chore/update-api-spec` if
it changed.

To update manually:
```bash
curl -s https://api.demo.if.team/api-json -o docs/api-spec.json
```

## Testing

- **Runner:** vitest. `npm test` (one-shot), `npm run test:watch`.
- **Location:** co-locate `*.test.ts` next to the module under test.
- Run `npm test` before committing.

## Build & release

- **Build:** `tsc -p tsconfig.build.json` → `dist/`.
- **Dev:** `npm run dev` (watch mode).
- **Type-check:** `npm run type-check`.

## Conventions (quick)

- Filenames: **kebab-case**
- No barrel files except per-group `index.ts` wiring Commander
- Mutating commands (`add`/`create`/`update`): always support `--json`
  outputting the resulting entity via `printJson()` — see AGENTS.md
- User-facing errors: throw `CliError(code, message, hints?)` from
  `src/lib/errors.ts`; never call `process.exit()` directly in command handlers
- Global flags checked via `src/lib/global-args.ts` — always call `isJsonMode()`
  before printing human-readable output

## Start here if new

1. `src/index.ts` — entry + command registry
2. `src/commands/auth/index.ts` — canonical group command
3. `src/commands/auth/login.ts` — canonical write command
4. `src/lib/errors.ts` + `src/lib/output.ts` — what's already built
5. `AGENTS.md` — rules you must follow
6. `docs/api-spec.json` — API reference (OpenAPI 3.0)
