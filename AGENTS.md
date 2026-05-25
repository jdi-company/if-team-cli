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

## Repository Layout

```
/
├─ src/                   # All source
│  ├─ index.ts            # Entry: Commander setup, lazy command registry
│  ├─ commands/           # One folder per command group
│  │  └─ auth/            # login, logout, status
│  └─ lib/                # Shared utilities
│     ├─ errors.ts        # CliError class + error codes
│     ├─ global-args.ts   # isJsonMode(), isNdjsonMode()
│     ├─ logger.ts        # -v verbosity helper
│     ├─ output.ts        # formatError, formatErrorJson, printJson, printSuccess
│     └─ spinner.ts       # ora wrapper (startSpinner, stopSpinner, etc.)
├─ docs/
│  └─ api-spec.json       # OpenAPI 3.0 spec (auto-updated by GitHub Action)
├─ .github/
│  └─ workflows/
│     └─ check-api-spec.yml   # Daily spec drift check → auto PR
├─ AGENTS.md              # This file
├─ CLAUDE.md              # One-liner forward to AGENTS.md
├─ tsconfig.json
├─ tsconfig.build.json
├─ vitest.config.ts
└─ package.json
```

## Architecture Flow

1. `src/index.ts` sets `program.name('if-team')`, registers global flags (`--quiet`, `-v`, `--no-spinner`), and builds a **lazy command registry** — `Record<name, [description, loader]>`.
2. Placeholder subcommands are registered so `--help` lists everything without importing any module.
3. The invoked command name is extracted from `process.argv`; only that command's loader runs. The real `registerXxxCommand(program)` replaces the placeholder.
4. `program.parseAsync()` runs the action handler. Uncaught `CliError` is rendered via `formatError()` (pretty) or `formatErrorJson()` (JSON mode) and exits with code 1.

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

## API Client

- Base URL comes from the `IF_TEAM_API_URL` environment variable (default: `https://api.if.team`).
- Token comes from `IF_TEAM_TOKEN` environment variable or stored credentials.
- The API spec (`docs/api-spec.json`) is the authoritative reference for request/response shapes.

## Testing

Tests use vitest. Co-locate test files next to the module they cover (`foo.ts` → `foo.test.ts`). Run `npm test` before committing.

## API Spec Updates

The OpenAPI spec is stored at `docs/api-spec.json`. A daily GitHub Action (`check-api-spec.yml`) downloads the live spec, diffs it against the stored version, and opens a PR automatically if it changed. To update manually:

```bash
curl -s https://api.demo.if.team/api-json -o docs/api-spec.json
```
