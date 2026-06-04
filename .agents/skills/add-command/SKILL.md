---
name: add-command
description: Add a new command or subcommand to the if-team CLI. Use when wiring an if.team API endpoint into `if-team` — covers DTO inspection, the list/show/create/update/delete recipes, the project's hard-won gotchas, tests, and skill sync.
---

# Adding a command to the if-team CLI

How to wire an if.team API endpoint into the `if-team` CLI without re-discovering the
traps that already bit us. Read [AGENTS.md](../../../AGENTS.md),
[docs/patterns.md](../../../docs/patterns.md), and [CODEBASE.md](../../../CODEBASE.md)
once before your first command; this skill is the operational checklist on top of them.

**Golden rule: inspect the DTO in `docs/api-spec.json` before writing a single flag.**
The spec is the source of truth, but it is *under*-specific — types, required lists, and
the body-vs-query split routinely surprise you. Step 0 is not optional.

---

## Step 0 — Inspect the endpoint and its DTO (do this first)

`docs/api-spec.json` is a 466-path OpenAPI 3.0 document. Resolve the operation **and the
`$ref`'d request DTO** before deciding on flags. Save this snippet and run it:

```bash
cat > /tmp/dto.mjs <<'EOF'
import { readFileSync } from 'node:fs'
const spec = JSON.parse(readFileSync('docs/api-spec.json','utf8'))
const [path, method='post'] = process.argv.slice(2)
const resolve = (ref)=> ref.replace('#/','').split('/').reduce((o,k)=>o[k], spec)
const op = spec.paths[path]?.[method]
if(!op){ console.error('no op', path, method); process.exit(1) }
console.log(`# ${method.toUpperCase()} ${path}`)
for(const p of (op.parameters||[])){
  const s=p.schema||{}
  console.log(`param ${p.name} [${p.in}] required=${!!p.required} type=${s.type||s.$ref||'?'}${s.enum?` enum=${JSON.stringify(s.enum)}`:''}`)
}
const ref = op.requestBody?.content?.['application/json']?.schema?.$ref
if(ref){
  const dto = resolve(ref)
  console.log(`body ${ref.split('/').pop()} required=${JSON.stringify(dto.required||[])}`)
  for(const [k,v] of Object.entries(dto.properties||{})){
    const t = v.type || (v.$ref?`obj→${v.$ref.split('/').pop()}`:'') || (v.allOf?'allOf':'') || '?'
    const items = v.items?.$ref ? `[]→${v.items.$ref.split('/').pop()}` : (v.items?.type?`[]${v.items.type}`:'')
    console.log(`  ${k}: ${t}${items}${v.format?` fmt=${v.format}`:''}${v.enum?` enum=${JSON.stringify(v.enum)}`:''}${v.nullable?' nullable':''}${(dto.required||[]).includes(k)?'  (REQUIRED)':''}`)
  }
}
EOF
node /tmp/dto.mjs /iterations post          # endpoint + method
node /tmp/dto.mjs /tasks get                 # also use it for list filters
```

To drill into a nested DTO that the output names (`obj→Foo`, `[]→Foo`):

```bash
node -e "const s=require('./docs/api-spec.json');const d=s.components.schemas['ResponsiblesTaskDto'];console.log(JSON.stringify({required:d.required,props:Object.keys(d.properties)},null,1))"
```

### What the spec will *not* tell you — verify these every time

These are real cases from this codebase. Assume each new endpoint hides at least one.

1. **Conditional requirements aren't in `required`.** `POST /iterations` lists only
   `name` + `to_project_amount` as required, but the API *also* rejects a missing `amount`
   once `to_project_amount` is `true`. We handle it with post-merge defaults in
   `iteration/create.ts` — see the create recipe below. Probe with a real call (`-vvv`) when
   a field smells conditional.
2. **Required fields you wouldn't guess.** `POST /tasks` requires `client_ids` (an
   array of strings!) alongside `name`. Surfacing it as a flag (`--client`) is not optional.
3. **`string` lies about format.** `CreateTaskDtoV1_1.start_at` is typed bare `string`, but
   the live task API wants ISO 8601 datetime (`2026-05-26T00:00:00.000Z`) — while project and
   iteration endpoints accept plain `YYYY-MM-DD`. The spec gives no `format`. Confirm against
   `docs/patterns.md` ("Per-command quirks") and live `-vvv` testing.
4. **Body vs. query split.** `project_id` (tasks, iterations) and `stop` (task delete) and
   `transaction-deletion-method` (project/iteration delete) are **query params**, not body
   fields — pass them via `apiRequest(path, { query: {...} })`. `company_id` is **auto-injected**
   by `apiRequest`; never add a `--company` flag or put it in the body.
5. **List filters are bracket-notation.** `GET /tasks` silently ignores `project_id=5`; it
   only honors `filter[project_id][]=5`. Even single-value filters use the `[]` array form.
   Date filters are an indexed tuple: `filter[start_at][0]=from&filter[start_at][1]=to`.
   The filterable fields live in the `*FilterDto` schema (e.g. `ProjectFilterDto` exposes
   `filter[name]`, which is how `project list --name` works).
6. **i18n-shaped response fields.** List items wrap values in objects: `finish_at` can be
   `{ date, show_time, color }`, `name` can be `{ name: "..." }`. Check the response schema
   before assuming a column is a primitive (see `project/list.ts` defensive accessors).
7. **`show` endpoints return envelopes.** `GET /tasks/{id}` returns
   `{ task, dependencyTasks, checklists, … }`. Unwrap for key-value display, but pass the
   **raw envelope** through for `--json`/`--ndjson`.

---

## Step 1 — Decide the shape

- **New resource group?** Create `src/commands/<name>/` with `index.ts` (parent + wiring)
  and one sibling file per subcommand. Register a lazy loader in `src/index.ts`'s registry:
  ```typescript
  <name>: ['Short description', async () => (await import('./commands/<name>/index.js')).registerXxxCommand],
  ```
- **New subcommand on an existing group?** Add `src/commands/<group>/<action>.ts` and wire it
  in that group's `index.ts`.
- **Verbs:** `list` / `show <id>` / `create` / `update <id>` / `delete <id>`, plus an implicit
  default `view`: `.command('view [id]', { isDefault: true })` so `if-team <group> <id>` works.
  Reference/lookup endpoints (statuses, types, priorities) follow the read-only `statuses.ts`
  pattern.
- Filenames: **kebab-case**. No barrel files except the per-group `index.ts`.

---

## Step 2 — Implement (canonical recipes)

Don't reimplement shared helpers — they live in `src/lib/`. Import:
`apiRequest` (`api/client.ts`), `CliError` (`errors.ts`),
`isJsonMode`/`isNdjsonMode`/`isQuietMode` (`global-args.ts`),
`printJson`/`printNdjson`/`printSuccess`/`printTable`/`printKeyValue` (`output.ts`),
`startSpinner`/`stopSpinner` (`spinner.ts`),
`parseDataInput`/`mergeBody`/`asNumber`/`collectStrings`/`collectNumbers`/`confirmMutation`/`confirmDeletion` (`mutate.ts`).

### List (read)

- Export `buildQuery(options)` separately so query construction is unit-testable without
  mocking `apiRequest`. Serialize list filters as `filter[<field>][]` (see Step 0 #5).
- Branch on `isJsonMode()` (pretty) / `isNdjsonMode()` (one object per line) before the table.
- Human output: `printTable(rows, columns)` then `Showing X of Y (page N, limit L)`.

### Show (read)

- Export `parseId(input)` — throw `CliError('MISSING_ID' | 'INVALID_REF', …)` on bad input.
- Catch `apiRequest` errors: `if (err.code === 'NOT_FOUND') throw new CliError('NOT_FOUND', '<Entity> "<id>" not found.')`.
  **Never regex the server message** — it's locale-fragile (the API speaks Ukrainian).
- Unwrap envelopes for `printKeyValue`; pass the raw envelope to `printJson`/`printNdjson`.

### Create / Update (mutations)

- Named flags for common DTO fields **plus** a single `--data <json>` (literal | `@file` | `-`).
- Export `buildCreateBody`/`buildUpdateBody` taking only the parsed options — no I/O.
- Use `mergeBody(parseDataInput(options.data), flags)`. Flags override `--data`; `undefined`
  flags are skipped. `asNumber(value, '--flag')` coerces numeric strings.
- **Light validation by default:** send what the user gave and let the API 422.
  `apiRequest` flattens the `errors` map into `CliError` hints (`→ status_id: …`).
- **But fix known double-422 traps with post-merge defaults** (Step 0 #1). Run them
  *after* `mergeBody` so values from `--data` still win:
  ```typescript
  const body = mergeBody(data, flags)
  if (body.to_project_amount === undefined) body.to_project_amount = false
  if (body.to_project_amount === true && body.amount === undefined) body.amount = 0
  return body
  ```
- `update` calls `confirmMutation(title, body, options)` before the PATCH; reject an empty
  merged body with `CliError('NO_CHANGES', …)`.
- Output: `--json`/`--ndjson` print the entity; otherwise `printSuccess(...)`. Under
  `isQuietMode()`, create falls back to bare `console.log(res.id)` so the ID stays pipeable.

### Delete

- `confirmDeletion(summary, options)` before the DELETE. No body, no `buildDeleteBody`.
- Pass per-endpoint query params discovered in Step 0 (`stop`, `transaction-deletion-method`).

### Gotcha — Commander negation flags

`.option('--foo')` does **not** synthesize `--no-foo` unless it has a boolean default.
Declare both forms explicitly when you need negation without a default:

```typescript
.option('--to-project-amount',    'Set to_project_amount = true')
.option('--no-to-project-amount', 'Set to_project_amount = false')
```

Serialize booleans into the query as the strings `'true'` / `'false'` (`apiRequest`'s `query`
is `Record<string, string | number>`).

---

## Step 3 — Flag conventions

| Command type | Flags |
|---|---|
| Read (list) | `--json`, `--ndjson`, `--page`, `--limit`, plus server-side `filter[…]` flags |
| Read (show/view) | `--json`, `--ndjson` |
| Create | named DTO flags, `--data`, `--json`, `--ndjson`, `-q/--quiet` (bare ID) |
| Update | named DTO flags, `--data`, `--yes`, `--json`, `--ndjson` |
| Delete | `--yes`, endpoint query flags, `--json`, `--ndjson` |

Always check `isJsonMode()` / `isNdjsonMode()` / `isQuietMode()` before printing human text.

---

## Step 4 — Tests

vitest, co-located `*.test.ts`. Cover the **pure exported functions** without mocking the API:

- `buildQuery` → every flag maps to the right `filter[…][]` / param key, and combinations.
- `parseId` → returns the int; throws `MISSING_ID` / `INVALID_REF` on bad input.
- `buildCreateBody` / `buildUpdateBody` → flag→API-field mapping, `--data` blend, and **every
  post-merge default** (including the `--data`-supplied-value-wins case). See
  `src/commands/iteration/mutate.test.ts` for the template.

Live-API smoke tests (`*.int.test.ts`) are gated behind `IF_TEAM_INT_*` env vars and skipped
by default — use them to confirm the spec's lies (Step 0 #1, #3).

---

## Step 5 — Document & sync

1. **`src/commands/<group>/index.ts`** — add an `.addHelpText('after', …)` example and a
   one-line `.description()` per subcommand. Note conditional/unobvious flags in their help
   text (e.g. "required by the API when to_project_amount is true; defaults to 0").
2. **`COMMANDS.md`** — add usage examples for the new commands.
3. **`src/lib/skills/content.ts`** — update `SKILL_CONTENT` (the end-user agent skill).
   **Edit `content.ts`, never `skills/if-team-cli/SKILL.md` directly** — it's generated.
   Prefer `--ndjson` over `--json` in examples (cheaper for agents to parse).
4. Regenerate and verify:
   ```bash
   npm run sync:skill          # regenerates skills/if-team-cli/SKILL.md from content.ts
   ```

---

## Step 6 — Verify before committing

```bash
npm run type-check
npm test
npm run check:skill-sync     # CI fails if SKILL.md drifted from content.ts
node dist/index.js <group> <sub> --help   # eyeball the help output (npm run build first)
```

Use `-vv` / `-vvv` for manual QA — `apiRequest` logs `→ METHOD url`, `← status`, and (at
`-vvv`) the request body, so you can confirm flags reach the wire in the shape the DTO wants.

---

## Quick checklist

- [ ] Ran the Step 0 DTO inspector; noted required fields, conditional requirements, body-vs-query split, and format quirks.
- [ ] Files in `src/commands/<group>/`, kebab-case; lazy loader registered in `src/index.ts` (new group).
- [ ] Exported `buildQuery` / `parseId` / `buildCreateBody` / `buildUpdateBody` for tests.
- [ ] Bracket-notation list filters; ISO-datetime where the live API demands it.
- [ ] `--no-*` negation flags declared explicitly where needed.
- [ ] Post-merge defaults for any known double-422 trap (after `mergeBody`).
- [ ] `confirmMutation` on update, `confirmDeletion` on delete; `NO_CHANGES` on empty update.
- [ ] 404 mapped via `err.code === 'NOT_FOUND'`, not message regex.
- [ ] `--json` / `--ndjson` / `--quiet` honored; create prints bare ID under `--quiet`.
- [ ] Tests for query/body/id builders incl. `--data` blend and every default.
- [ ] `content.ts` updated (not the `.md`), `npm run sync:skill` run, `COMMANDS.md` updated.
- [ ] `npm run type-check && npm test && npm run check:skill-sync` all green.
