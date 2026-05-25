# if-team CLI

> For repo structure, where things live, and shared utilities, read
> [CODEBASE.md](./CODEBASE.md) first. This file covers the **rules**;
> CODEBASE.md is the **map**.
>
> The repository structure follows [Doist/todoist-cli](https://github.com/Doist/todoist-cli) conventions.
> When in doubt about a pattern, check that repo first.

## What is if.team?

[if.team](https://if.team) is an all-in-one ERP platform for creative and tech companies — agencies, software studios, consulting firms. It consolidates:

- **Project management** — Gantt, Kanban, custom stages, iterations
- **Task management** — tasks, subtasks, checklists, priorities, custom fields
- **Time tracking & workload** — workload calendars, reports
- **Finance** — transactions, cash flow, P&L, salaries, quotes, invoices
- **CRM** — clients, leads, pipelines, custom fields
- **Team & HR** — participants, departments, positions, roles, recruitment, vacations
- **Knowledge base** — documents and directories
- **Chats** — project and direct messaging
- **Files** — upload, storage, sharing
- **Integrations** — ClickUp, HubSpot, Monday.com, bank feeds, webhooks

The REST API is documented as an OpenAPI 3.0 spec stored at `docs/api-spec.json` (fetched from `https://api.demo.if.team/api-json`). A GitHub Action checks for spec changes daily and opens a PR when it detects a diff.

## What is if-team-cli?

`if-team-cli` is a TypeScript CLI for the if.team API. Binary name: `if-team`.

ESM-only · Node ≥ 20.18.1 · Commander 14 · vitest · TypeScript 5.

It is structured identically to [Doist/todoist-cli](https://github.com/Doist/todoist-cli). Refer to that repo for any pattern not yet documented here.

## Build & Run

```bash
npm install             # install dependencies
npm run build           # compile TypeScript → dist/ (uses tsconfig.build.json)
npm run dev             # watch mode
npm run type-check      # type-check without emitting
npm test                # run vitest tests
npm run test:watch      # watch mode for tests
```

**Two-tsconfig setup:** `tsconfig.json` includes source + tests (IDE and `type-check`). `tsconfig.build.json` extends it but excludes `*.test.ts` files (used by `build` and `dev`).

**Run the CLI directly** (no linking needed):

```bash
node dist/index.js --help
node dist/index.js auth status
```

## Adding a New Command Group

1. Create `src/commands/{name}/index.ts` exporting `registerXxxCommand(program: Command): void`.
2. Subcommand logic lives in sibling files: `{name}/list.ts`, `{name}/add.ts`, etc.
3. Register the loader in `src/index.ts`:
   ```typescript
   {name}: [
       'Short description',
       async () => (await import('./commands/{name}/index.js')).registerXxxCommand,
   ],
   ```
4. The placeholder in the registry auto-registers for `--help` — no extra step needed.

## Command Conventions (follow todoist-cli exactly)

- **Group commands** (`task/`, `project/`, etc.): `index.ts` creates a parent command, each subcommand's logic in a sibling file.
- **Implicit `view` subcommand**: register `.command('view [ref]', { isDefault: true })` so `if-team project <ref>` dispatches to `if-team project view <ref>`.
- **Named flag aliases**: where commands accept positional args (project, task), also accept `--project`, `--task` flags. Error if both positional and flag are provided.
- **`--json` on all mutating commands**: output the resulting entity as JSON when `--json` is passed. Use `printJson()` from `src/lib/output.ts`.
- **`--ndjson`**: output one JSON object per line (for piping / streaming).
- **`--dry-run`**: preview what would happen without executing.
- **`--yes`**: skip confirmation prompts on destructive operations.
- **`--quiet` / `-q`**: suppress success messages; create commands still print the created entity's ID.

## Errors

Throw `CliError(code, message, hints?)` from `src/lib/errors.ts` for anything user-facing:

```typescript
throw new CliError('NOT_FOUND', `Task "${ref}" not found.`, [
    'Use `if-team task list` to see available tasks.',
])
```

The global `parseAsync().catch` in `src/index.ts` routes `CliError` to the correct formatter (pretty or JSON). Never call `process.exit()` directly in command handlers.

## if.team Auth Model

if.team has a **two-tier auth system**. Understanding this is critical when adding new commands.

### Tier 1 — API Key (`apikey` header)

Created in the if.team admin dashboard per company. Sent as `apikey: <token>` header.

**Works on:** all business/resource endpoints (projects, tasks, finance, CRM, etc.)  
**Does NOT work on:** `/auth/*` endpoints, `/companies` — these require Bearer JWT  
**Requires:** `company_id` query parameter on virtually every request  
**Validation probe:** `GET /subscriptions/current?company_id=<id>` — safe verification without Bearer auth

### Tier 2 — Bearer JWT (`Authorization: Bearer` header)

Obtained via `POST /auth/login` with email + password. Short-lived; auto-refreshed using the refresh token via `POST /auth/refresh` (sends refresh token as Bearer header, no request body).

**Works on:** all endpoints including `/auth/*` and `/companies`  
**Requires:** `company_id` query parameter on business endpoints  
**Auto-refresh:** `apiRequest()` checks expiry 30 s early and refreshes silently

### `auth login` flow

**Email/password mode** (`if-team auth login`):
1. Prompt email (visible) and password (silent — no echo, enterprise standard)
2. `POST /auth/login` → access token + refresh token
3. If `companies` absent from response, call `GET /companies` with the JWT
4. User selects company from numbered list (auto-selects if only one)
5. Store JWT + company metadata in OS keychain

**API key mode** (`if-team auth login --key`):

The `--key` flag accepts an optional value. Three behaviours:

| Invocation | Behaviour |
|---|---|
| `--key` (no value) | Prompts silently for the key — **recommended**, nothing in shell history |
| `--key <value>` | Uses the inline value; prints a history warning |
| `IF_TEAM_TOKEN` env var set, no `--key` | Uses env var as the API key (session-only, never stored) |

Steps (all three paths share the same flow once the key is resolved):
1. Resolve API key (silent prompt, inline value, or env var — see table above)
2. Note displayed: email/password needed once to discover companies, will not be stored
3. Prompt email and password (same silent prompt)
4. `POST /auth/login` → temporary JWT (used only for company discovery)
5. `GET /companies` with temporary JWT → company list
6. User selects company
7. Validate API key: `GET /subscriptions/current?company_id=<id>` with `apikey` header
8. **Discard JWT** — store only API key + company metadata in OS keychain

### Auth precedence in `apiRequest()`

1. `IF_TEAM_TOKEN` env var → API key mode, session-only, never stored to disk
2. Stored credentials from keychain → API key or JWT (whichever was used at login)
3. No credentials → throws `CliError('NO_TOKEN', …)`

### `company_id` resolution when `IF_TEAM_TOKEN` is set

`IF_TEAM_TOKEN` alone is not enough — every business endpoint also requires `company_id`. Resolution order:

1. `IF_TEAM_COMPANY_ID` env var — explicit, fully env-based (no keychain needed)
2. `companyId` from stored keychain credentials — convenient fallback when a prior `auth login` exists
3. Neither → throws `CliError('NO_COMPANY', …)` with a hint to set `IF_TEAM_COMPANY_ID`

Example (fully env-based, no stored credentials required):
```bash
IF_TEAM_TOKEN=<key> IF_TEAM_COMPANY_ID=123 if-team task list
```

### `company_id` injection

`apiRequest()` automatically appends `?company_id=<stored>` to every request unless the caller already provides it in the `query` option. Never omit `company_id` in manual `fetch()` calls outside `apiRequest()`.

### Credential storage

Credentials are stored as a JSON blob in the **OS keychain** via `@napi-rs/keyring`:
- macOS: Keychain Access (service: `if-team-cli`, account: `credentials`)
- Windows: Credential Manager
- Linux: libsecret / Secret Service

If the keychain is unavailable, falls back to `~/.config/if-team-cli/credentials.json` with `chmod 600` and a warning. The config file (`config.json` in the same dir) holds only `baseUrl` — never a secret.

**API key credentials stored:** `{ mode, key, companyId, companyName }`  
**JWT credentials stored:** `{ mode, accessToken, refreshToken, email, name, companyId, companyName }`  
**Never stored:** email, password (discarded after login), temporary JWT in API key flow

## API Client

- **Base URL:** `https://api.demo.if.team` (default). Override with `IF_TEAM_API_URL` env var.
- The API spec (`docs/api-spec.json`) is the authoritative reference for request/response shapes.
- Use `apiRequest()` from `src/lib/api/client.ts` for all authenticated calls — it handles headers, `company_id`, and JWT refresh automatically.

## Testing

Tests use vitest. Co-locate test files next to the module they cover (`foo.ts` → `foo.test.ts`). Run `npm test` before committing.

## API Spec Updates

The OpenAPI spec is stored at `docs/api-spec.json`. A daily GitHub Action (`check-api-spec.yml`) downloads the live spec, diffs it against the stored version, and opens a PR automatically if it changed. To update manually:

```bash
curl -s https://api.demo.if.team/api-json -o docs/api-spec.json
```
