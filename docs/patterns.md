# Command Patterns

Conventions for adding new commands. Mirrors [Doist/todoist-cli](https://github.com/Doist/todoist-cli); check that repo when a pattern isn't covered here.

## Adding a new command group

1. Create `src/commands/{name}/index.ts` exporting `registerXxxCommand(program: Command): void`.
2. Subcommand logic lives in sibling files (`{name}/list.ts`, `{name}/add.ts`, …).
3. Register the loader in `src/index.ts`:

   ```typescript
   {name}: [
       'Short description',
       async () => (await import('./commands/{name}/index.js')).registerXxxCommand,
   ],
   ```

4. The placeholder in the registry auto-registers for `--help` — no extra step needed.

## Common conventions

- **Group commands** (`task/`, `project/`, …): `index.ts` creates a parent command, each subcommand's logic in a sibling file.
- **Implicit `view` subcommand**: register `.command('view [id]', { isDefault: true })` so `if-team project <id>` dispatches to `if-team project view <id>`. Use `<id>` (not `<ref>`) — reads as "an integer ID" to users.
- **Named flag aliases**: where commands accept positional args (project, task), also accept `--project`, `--task` flags. Error if both positional and flag are provided.
- **`--json` on all mutating commands**: output the resulting entity as JSON when `--json` is passed. Use `printJson()` from `src/lib/output.ts`.
- **`--ndjson`**: output one JSON object per line (for piping / streaming). On `show` / `view`, `--ndjson` collapses to one compact line — handy for piping a single record to `jq` or an LLM.
- **`--dry-run`**: preview what would happen without executing.
- **`--yes`**: skip confirmation prompts on destructive operations.
- **`--quiet` / `-q`**: suppress success messages via `printSuccess()` (no-ops under `isQuietMode()`). Create commands still print the created entity's ID as a bare number (pipeable).

## List & show commands (read-only)

Canonical examples: `src/commands/task/list.ts`, `src/commands/task/show.ts`.

- **Extract `buildQuery(options)`** from `listCommand` and export it — query construction unit-testable without mocking `apiRequest`.
- **Extract `parseId(input)`** from `showCommand` and export it; throw `CliError('MISSING_ID', …)` or `CliError('INVALID_REF', …)` for bad input.
- **Bracket-notation filters**: NestJS DTOs use form-array notation. Pass keys like `'filter[status_id][]': '5'` directly to `apiRequest`'s `query` option — `URLSearchParams.set()` URL-encodes them correctly. **Direct query params** (e.g. `project_id`) take precedence over `filter[project_id][]` when both exist; prefer the direct one.
- **Dates (list filters)**: validate `YYYY-MM-DD` with `/^\d{4}-\d{2}-\d{2}$/` and throw `CliError('INVALID_OPTIONS', …)`. Don't accept other formats — the API wants ISO dates for filters.
- **Envelope unwrapping**: some `GET /{resource}/{id}` endpoints return wrapped envelopes (e.g. `GET /tasks/{id}` returns `{ task, dependencyTasks, checklists, … }`). Unwrap before formatting key-value output, but for `--json`/`--ndjson` pass the **raw envelope** through — callers may need the extras.
- **404 mapping**: catch `CliError` from `apiRequest` and re-throw `CliError('NOT_FOUND', …)` with an entity-scoped message when `err.code === 'NOT_FOUND'` (no longer a regex on the server message — `apiRequest` now raises the code directly on HTTP 404).
- **Human output**: list → `printTable(rows, columns)` then `Showing X of Y (page N, limit L)`; show → `printKeyValue([['Key', value], …])`.
- **i18n-shaped fields**: some list-item fields wrap their value in an object (e.g. `name: { name: "..." }`, `finish_at: { date, show_time, color }`). Check `docs/api-spec.json` for the actual schema before assuming a field is primitive.

## Create, update & delete commands (mutations)

Canonical examples: `src/commands/iteration/create.ts`, `update.ts`, `delete.ts`.

- **Named flags + `--data` blend**: expose common DTO fields as `.option('--name', …)` etc.; expose the rest of the DTO via a single `--data <json>` flag (literal JSON string, `@path/to/file.json`, or `-` for stdin). Named flags override fields with the same key from `--data`.
- **Body construction is testable**: export `buildCreateBody(options)` / `buildUpdateBody(options)` from each command file. They take only the parsed flag object and return the merged body — no `apiRequest` involvement, no I/O.
- **Shared helpers in `src/lib/mutate.ts`**: `parseDataInput(input)` handles JSON / `@file` / `-` and throws `INVALID_OPTIONS` on parse errors. `mergeBody(data, flags)` overlays flag values onto `--data`, skipping `undefined`s. `asNumber(value, flag)` coerces numeric strings and throws `INVALID_OPTIONS` for non-numeric input. `collectStrings` / `collectNumbers(flag)` are Commander collectors for repeatable flags — pass them as the third arg to `.option(...)` **without** a default value, so unset flags stay `undefined` instead of `[]`.
- **Light validation**: don't codify each DTO's `required` list. Send what the user provided and let the API return 422 with field errors. `apiRequest` now flattens the response's `errors` map into `CliError` hints — users see per-field constraint messages like `→ status_id: Це поле не може бути порожнім` instead of a bare "Unprocessable entity".
- **`update` requires confirmation**: call `confirmMutation(title, body, options)` before the PATCH. Prints a `key: value` summary and prompts `Continue? [y/N]`. `--yes` skips the prompt; non-TTY contexts (JSON mode, piped stdin) without `--yes` throw `CONFIRMATION_REQUIRED`.
- **`delete` requires confirmation**: call `confirmDeletion(summary, options)` before the DELETE. Same `--yes` / non-TTY / JSON-mode contract, but prints only the bold summary line. Negative answer throws `ABORTED`.
- **Delete has no body and no `buildDeleteBody`**: there's no DTO worth unit-testing; existing `parseId` coverage from `show.ts` is enough.
- **404 mapping**: catch `err.code === 'NOT_FOUND'` from `apiRequest` (locale-safe — replaced the previous regex on the server message) and re-throw with an entity-scoped message like `Project "${id}" not found.`
- **Reject empty updates**: throw `CliError('NO_CHANGES', …)` when the merged body is `{}` — saves a pointless API round-trip.
- **Required path/query params**: enforce via positional `<id>` or `.requiredOption()`. Commander handles missing-arg errors at parse time.
- **POST endpoints that take extra query params**: pass them via `apiRequest('/tasks', { method: 'POST', query: { project_id }, body: … })`. `apiRequest` still auto-injects `company_id`.

## Commander negation flags (gotcha)

Commander 14 does **not** automatically synthesize `--no-foo` from `.option('--foo', '…')` unless `--foo` has a default value AND it's the boolean-with-default form. In practice, **declare both forms explicitly** when you need negation without a default — otherwise users get "unknown option '--no-foo'".

```typescript
// Stays `undefined` when neither flag is passed (matches mergeBody's skip-undefined contract)
.option('--to-project-amount',    'Set to_project_amount = true')
.option('--no-to-project-amount', 'Set to_project_amount = false')
```

```typescript
// `--stop` defaults true; `--no-stop` declared explicitly so users can opt out
.option('--stop',    'Stop active time tracking before delete (default)', true)
.option('--no-stop', 'Do not stop active time tracking before delete')
```

Serialise booleans to the query as `'true'` / `'false'` because `apiRequest`'s `query` is typed `Record<string, string | number>`.

## Per-command quirks

- **Task delete: mandatory `stop` query**: `DELETE /tasks/{id}` requires `stop` (boolean) per the spec. See the negation pattern above.
- **Project & iteration delete: optional `--transaction-deletion-method`**: pass through to the query only when set (no default). Example value: `COMPLETE_REMOVAL`.
- **Task `--start-at` / `--finish-at`**: the task API wants **ISO 8601 datetime** (`2026-05-26T00:00:00.000Z`), not plain `YYYY-MM-DD`. Project and iteration endpoints accept plain dates.
- **Task update**: API requires `start_at` on PATCH — the `NO_CHANGES` hint mentions this; surface it in command help if you hit unexpected 422s.

## Verbose request logging

`apiRequest` emits via the existing `log()` helper (`src/lib/logger.ts`):

- `-vv` → `→ METHOD url` + `← status statusText`
- `-vvv` → adds `  body: …` for non-empty bodies

Useful when verifying that flags reach the wire (query params, body shape) during manual QA.
