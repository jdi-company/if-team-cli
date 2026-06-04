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
8. **`list` endpoints may wrap results in a pagination envelope the spec hides.**
   `GET /workload` is documented as returning a bare `array` of `Workload`, but the live API
   returns `{ currentPage, data, nextPage, time_plan, time_spent }`. A `printTable(res, …)`
   then dies with `rows.map is not a function` and `--ndjson` iterates the wrong thing. Unwrap
   `.data` and tolerate both shapes: `const items = Array.isArray(res) ? res : res.data ?? []`.
   See `workload/list.ts`.
9. **`PATCH` may reject a *partial* body with a 500 — or silently wipe the omitted fields.**
   Two flavors of the same read-modify-write trap:
   - `PATCH /workload/{id}` marks every field optional but returns `500 "DB Error"` unless
     `time` + `start_at` + `participant_id` are all present.
   - `PATCH /clients/{id}` accepts a partial body with `200` but treats it as a **full
     replace**: a `{ phone }`-only update silently flipped `type` from `legal` to `individual`
     (the client jumped lists). No error — you only notice on the next read.

   Either way: **fetch the current entry first and hydrate the unchanged fields before the
   PATCH.** See `workload/update.ts` and `client/update.ts` → `hydrateUpdateBody` (kept pure and
   unit-tested; the GET happens in the command action). When in doubt about whether a PATCH is a
   merge or a replace, assume replace and hydrate — verify with a partial update + re-read in
   live QA (Step 7).
10. **Bodyless POST action endpoints 400 on an absent body.** `POST /workload/start` and
   `/workload/finish` take no body fields, but `apiRequest` always sends
   `Content-Type: application/json`; with no body the server's JSON parser throws
   `400 "Unexpected end of JSON input"`. Pass `body: '{}'` on any action-style POST that has no
   DTO. (Create/update endpoints already send a body, and DELETEs are unaffected.)
11. **A few endpoints want the company as an `x-company-id` *header*, not the query param.**
   `apiRequest` injects `company_id` into the query string, which satisfies most of the API,
   but `GET /clients/roles` `403`s with `Header "x-company-id" is required`. `apiRequest` now
   sends the `x-company-id` header on every request too (harmless for query-only endpoints), so
   new commands get this for free — but if a brand-new endpoint `403`s on company despite the
   query param, this header is the first thing to check.

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

## Step 7 — Live QA against the API (mandatory; do it after the tests are green)

**Green unit tests are not proof the command works.** They exercise the *pure* builders against
the spec's idea of the API — which lies (Step 0). Every bug in the `workload` group survived a
fully green `npm test` and was caught only by running the built binary against the live API:
the `list` pagination envelope (#8), the partial-`PATCH` 500 (#9), and the bodyless-POST 400
(#10). So after coding **and** writing test cases, you must drive the real endpoints end-to-end.

**Never QA against real company data.** Create a disposable parent entity, do everything inside
it, and delete it afterward. Confirm the deletion. The CLI uses the user's saved keychain
credentials — treat the account as production.

Recipe:

1. `npm run build` (live QA runs `node dist/index.js …`, not the source).
2. `node dist/index.js auth status` — confirm you're authenticated and note the company.
3. **Create a throwaway parent**, clearly named so a human can spot it:
   `project create --name "QA-<group> (delete me)" …`. Discover required ids (status, currency,
   client, participant) with read-only calls — `… statuses`, or a tiny script importing
   `dist/lib/api/client.js`'s `apiRequest`. (Heads-up: `GET /clients` 422s without `type=legal|individual`.)
4. **Exercise every subcommand** you added against that entity, in both human and `--ndjson`
   form, plus the key error paths (`NOT_FOUND`, `NO_CHANGES`, `CONFIRMATION_REQUIRED`, bad input).
   Watch specifically for the Step 0 lies: envelope-vs-array on `list`, partial-body rejection on
   `update`, and empty-body rejection on bodyless POSTs.
5. **When live behavior contradicts the spec, fix the code, keep the pure logic testable, and add
   a unit test** for the corrected builder (e.g. `hydrateUpdateBody`), then re-run Step 6.
6. **Tear it all down** (`delete <id> --yes`, cascade from the parent) and **verify it's gone**
   (`show <id>` → `NOT_FOUND`). Remove any temp scripts.

Only after live QA passes and the data is cleaned up is the command done.

---

## Quick checklist

- [ ] Ran the Step 0 DTO inspector; noted required fields, conditional requirements, body-vs-query split, and format quirks.
- [ ] Files in `src/commands/<group>/`, kebab-case; lazy loader registered in `src/index.ts` (new group).
- [ ] Exported `buildQuery` / `parseId` / `buildCreateBody` / `buildUpdateBody` for tests.
- [ ] Bracket-notation list filters; ISO-datetime where the live API demands it.
- [ ] `--no-*` negation flags declared explicitly where needed.
- [ ] Post-merge defaults for any known double-422 trap (after `mergeBody`).
- [ ] `list` unwraps a pagination envelope if the API returns one (don't trust a bare-`array` spec).
- [ ] Partial `PATCH` hydrated from the current entry if the endpoint 500s on a partial body.
- [ ] Bodyless action POSTs send `body: '{}'`.
- [ ] `confirmMutation` on update, `confirmDeletion` on delete; `NO_CHANGES` on empty update.
- [ ] 404 mapped via `err.code === 'NOT_FOUND'`, not message regex.
- [ ] `--json` / `--ndjson` / `--quiet` honored; create prints bare ID under `--quiet`.
- [ ] Tests for query/body/id builders incl. `--data` blend and every default.
- [ ] `content.ts` updated (not the `.md`), `npm run sync:skill` run, `COMMANDS.md` updated.
- [ ] `npm run type-check && npm test && npm run check:skill-sync` all green.
- [ ] **Live QA done (Step 7):** every subcommand driven against a throwaway entity, bugs fixed + unit-tested, test data deleted and verified gone.
