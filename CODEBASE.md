# CODEBASE.md — Repo Map

> **Purpose:** a ~2000-token orientation file so Claude (and humans) can navigate
> this repo without exploring. Describes _what is where_; `AGENTS.md` describes
> _how to change things_. Update when structure shifts, not on every new file.

## What this project is

`if-team-cli` is a **TypeScript CLI** for [if.team](https://if.team) — an
all-in-one ERP for creative and tech companies. Binary name: `if-team`.

ESM-only · Node ≥ 24 · Commander 14 · vitest · TypeScript 6.

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
│  ├─ auth/
│  │  ├─ index.ts         # Registers login / logout / status subcommands
│  │  ├─ login.ts         # Dual-mode: API key (Option A) + email/password
│  │  ├─ logout.ts        # Server-side logout + keychain clear
│  │  └─ status.ts        # Shows mode, company, JWT expiry
│  ├─ project/            # Project browsing + mutations
│  │  ├─ index.ts         # list / statuses / show / create / update / delete (+ implicit `view`)
│  │  ├─ list.ts          # buildQuery() + listCommand() — --status, --page, --limit
│  │  ├─ show.ts          # parseId() + showCommand() — GET /projects/{id}
│  │  ├─ statuses.ts      # GET /project_statuses
│  │  ├─ create.ts        # buildCreateBody() + createCommand() — POST /projects
│  │  ├─ update.ts        # buildUpdateBody() + updateCommand() — PATCH /projects/{id}
│  │  └─ delete.ts        # deleteCommand() — DELETE /projects/{id}
│  │                      # optional --transaction-deletion-method query
│  ├─ task/               # Task browsing + mutations
│  │  ├─ index.ts         # list / statuses / priorities / show / create / update / delete
│  │  ├─ list.ts          # buildQuery() + listCommand() — --status, --project,
│  │  │                   # --start-at, --finish-at, --page, --limit
│  │  ├─ show.ts          # parseId() + showCommand() — GET /tasks/{id}
│  │  │                   # (unwraps TaskPageDocs envelope: response.task)
│  │  ├─ statuses.ts      # GET /task_statuses
│  │  ├─ priorities.ts    # GET /task_priorities
│  │  ├─ create.ts        # parseProjectId() + buildCreateBody() — POST /tasks
│  │  │                   # (project_id required as query param)
│  │  ├─ update.ts        # buildUpdateBody() + updateCommand() — PATCH /tasks/{id}
│  │  └─ delete.ts        # deleteCommand() — DELETE /tasks/{id}
│  │                      # required `stop` query (default true; --no-stop disables)
│  └─ iteration/          # Iteration browsing + mutations (per-project)
│     ├─ index.ts         # list <project_id> / statuses / show / create / update / delete
│     ├─ list.ts          # parseProjectId() + buildQuery() — required <project_id>
│     │                   # positional, --status, --page, --limit
│     ├─ show.ts          # parseId() + showCommand() — GET /iterations/{id}
│     ├─ statuses.ts      # GET /iteration_statuses
│     ├─ create.ts        # parseProjectId() + buildCreateBody() — POST /iterations
│     │                   # (project_id required as query param)
│     ├─ update.ts        # buildUpdateBody() + updateCommand() — PATCH /iterations/{id}
│     └─ delete.ts        # deleteCommand() — DELETE /iterations/{id}
│                         # optional --transaction-deletion-method query
└─ lib/                   # Shared utilities — don't reimplement
   ├─ api/
   │  └─ client.ts        # apiRequest(), loginRequest(), getCompanies(),
   │                      # validateApiKey(), logoutRequest()
   ├─ auth-store.ts       # Keychain read/write via @napi-rs/keyring,
   │                      # chmod-600 file fallback, StoredCredentials type
   ├─ config.ts           # Non-sensitive config (~/.config/if-team-cli/config.json)
   │                      # baseUrl only — never stores secrets
   ├─ errors.ts           # CliError(code, message, hints?) + ErrorCode union
   ├─ global-args.ts      # isJsonMode(), isNdjsonMode(), isQuietMode()
   ├─ logger.ts           # initializeLogger(), log(level, …) — -v verbosity
   ├─ mutate.ts           # parseDataInput (JSON literal | @file | -),
   │                      # mergeBody (flag overlay), confirmMutation,
   │                      # confirmDeletion, asNumber, collectStrings,
   │                      # collectNumbers
   ├─ output.ts           # formatError, formatErrorJson, printJson, printNdjson,
   │                      # printSuccess, printTable, printKeyValue
   ├─ prompt.ts           # promptText(), promptPassword() (silent — no echo),
   │                      # promptCompany()
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

- **`api/client.ts`** — `apiRequest<T>(path, options?)`: authenticated fetch
  wrapper. Injects auth header (Bearer or `apikey:`), auto-injects `company_id`
  from stored credentials, auto-refreshes expired JWTs. On error, throws
  `CliError('NOT_FOUND', …)` for HTTP 404 (so callers check `err.code`,
  not server message text) and flattens any 422 `errors` map into
  `CliError` hints. Emits `-vv` request/response lines and `-vvv` body via
  `log()`. Also exports `loginRequest()`, `getCompanies(accessToken)`,
  `validateApiKey(key, companyId)`, `logoutRequest()`.
- **`auth-store.ts`** — `storeCredentials()`, `loadCredentials()`,
  `clearCredentials()`. Uses `@napi-rs/keyring` (macOS Keychain / Windows
  Credential Manager / Linux libsecret). Falls back to a `chmod 600` file at
  `~/.config/if-team-cli/credentials.json` with a warning when keychain is
  unavailable. `StoredCredentials` is a discriminated union on `mode`:
  `'api-key'` (key + companyId + companyName) or `'jwt'` (tokens + email +
  name + companyId + companyName).
- **`config.ts`** — `loadConfig()`, `saveConfig()`. Reads/writes
  `~/.config/if-team-cli/config.json`. Contains only `baseUrl` — never a
  secret.
- **`prompt.ts`** — `promptText(query)`: standard readline prompt.
  `promptPassword(query)`: silent input (no echo) — enterprise standard,
  same as `sudo`/`ssh`/`gh`. Handles paste events correctly (multi-char data
  events). `promptCompany(companies)`: numbered company picker, auto-selects
  if only one.
- **`errors.ts`** — `CliError(code, message, hints?, type?)`. Throw for
  anything user-facing. `ErrorCode` union covers common codes; extend when
  adding new error states.
- **`output.ts`** — `formatError(err)`, `formatErrorJson(err)`,
  `printJson(data)`, `printNdjson(data)`, `printSuccess(msg)` (no-ops under
  `--quiet`), `printTable(rows, columns)` (aligned table; renders
  "(no results)" when empty), `printKeyValue(entries)` (aligned `key: value`
  block; renders `null`/`undefined` as em-dash).
- **`spinner.ts`** — `startSpinner(text)`, `stopSpinner()`,
  `succeedSpinner(text?)`, `failSpinner(text?)`. Auto-disabled in
  `--json` / `--ndjson` / `--no-spinner` modes.
- **`global-args.ts`** — `isJsonMode()`, `isNdjsonMode()`, `isQuietMode()`.
- **`logger.ts`** — `initializeLogger()`, `log(level, …)` (levels 1–4).

## if.team API

- **Base URL:** `https://api.demo.if.team` (override with `IF_TEAM_API_URL` env var)
- **Auth:** see AGENTS.md — two-tier system (API key vs Bearer JWT)
- **Spec:** `docs/api-spec.json` — OpenAPI 3.0, 445 endpoints

### Key API domains

| Domain | Base path | Notes |
|---|---|---|
| Auth | `/auth/*` | Login, register, OAuth (Google/Apple), refresh |
| Companies | `/companies` | Bearer only — returns user's company list |
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
- User-facing errors: throw `CliError(code, message, hints?)` — never `process.exit()` in handlers
- Global flags: always call `isJsonMode()` before printing human-readable output

## Start here if new

1. `src/index.ts` — entry + command registry
2. `src/commands/auth/login.ts` — canonical dual-mode command with keychain storage
3. `src/commands/task/list.ts` — canonical list command (bracket-notation filters,
   `buildQuery` export for tests, `--json` / `--ndjson` / table output)
4. `src/commands/task/show.ts` — canonical show command (`parseId` export,
   `--json` / `--ndjson` / key-value output, 404 → `NOT_FOUND` mapping,
   envelope unwrapping when the API wraps the entity)
5. `src/commands/iteration/create.ts` + `update.ts` — canonical mutation
   commands (named flags + `--data` blend, `buildCreateBody`/`buildUpdateBody`
   export for tests, `confirmMutation` on update)
6. `src/lib/api/client.ts` — how to call the API (auth, company_id injection, refresh)
7. `src/lib/mutate.ts` — shared mutation helpers (--data parsing, body merging, confirm)
8. `src/lib/auth-store.ts` — credential storage model
9. `AGENTS.md` — rules you must follow (especially the auth model section)
10. `docs/api-spec.json` — API reference (OpenAPI 3.0)
