# if-team CLI — Roadmap

Plan for growing the `if-team` CLI across the if.team API (`docs/api-spec.json`, OpenAPI 3.0).
The spec exposes **466 paths across 72 top-level resource groups**; the CLI ships **5** today.

**Scope policy: we cover the popular CRUD surface, not the whole API.** Whole categories of
endpoints are deliberately out of scope (see [Out of scope](#out-of-scope)) — analytics,
exports, bulk, integrations, and UI-state endpoints. Every group in the spec is accounted for
below, either in a phase or in the out-of-scope inventory.

> New command groups follow [docs/patterns.md](./docs/patterns.md): `list` / `show <id>` /
> `create` / `update <id>` / `delete <id>`, named flags + `--data` blend, `--ndjson` (preferred)
> / `--json` output, confirmation on mutate/delete. Adding one? Use the
> [`add-command` skill](./.agents/skills/add-command/SKILL.md) — it covers DTO inspection and
> the project's gotchas. **Command names mirror the spec's resource names** (e.g. the time-
> tracking group is `workload`, not `time`).

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Shipped |
| 🚧 | In progress |
| ⬜ | Planned |

---

## Shipped (baseline)

| Group | Commands | Notes |
|---|---|---|
| `auth` | login / logout / status | API-key + JWT, keychain storage |
| `project` | list / show / create / update / delete / statuses | `list --name` server-side search |
| `task` | list / show / create / update / delete / statuses / priorities | `--iteration`, `--assignee me` |
| `iteration` | list / show / create / update / delete / statuses | `to_project_amount`/`amount` defaults |
| `skill` | list / install / update / uninstall | agent skill installer |

---

## Phase 1 — Core daily-driver gaps

The highest-friction misses from real agent usage.

### 1.1 `workload` — time tracking ⬜

The single most-requested feature. The group is named `workload` in the API (it records
**logged time / time entries**); keep that name in the CLI and explain "time tracking" in help
text and SKILL.md.

| Subcommand | Endpoint | Notes |
|---|---|---|
| `workload log --task <id> --duration 2h --date <d>` | `POST /workload` | create a finished entry; accept `2h` / `90m` / `2h30m` and raw seconds |
| `workload start --task <id>` | `POST /workload/start` | start a live timer |
| `workload finish` | `POST /workload/finish` | stop the active timer |
| `workload comment --workload <id>` | `POST /workload/comment` | annotate an entry |
| `workload today` | `GET /workload/today` | today's entries |
| `workload list` | `GET /workload` | filter by task / participant / date range |
| `workload show/update/delete <id>` | `GET·PATCH·DELETE /workload/{id}` | edit / remove an entry |

SKILL.md currently says time logging is unsupported — replace that note when this lands.

### 1.2 `client` ⬜

Already referenced by `project --client` / `task --client`. `GET·POST /clients`,
`/clients/{id}`, `/clients/{id}/payment_details`, `/clients/{id}/individuals`, `/clients/roles`.

### 1.3 `participant` (read-first) ⬜

Backs `--assignee` / `--participant` resolution. Start read-only: `list`, `show`, `search`,
`permissions`. Mutations deferred to Phase 3.

### 1.4 Comments ⬜

Same shape across entities (`GET·POST /{entity}/{id}/comments`, `PATCH·DELETE …/{comment_id}`).
Ship `task comment` and `project comment` (list/add/update/delete) here; `lead` and
`transaction` comments arrive with their parent groups in Phase 2.

---

## Phase 2 — Finance & CRM (core CRUD only)

### 2.1 `transaction` ⬜

CRUD only: `expenses`, `payments`, `transfer`, `transactions` CRUD, `deleted` (+ restore),
`recurrent`. Lookups it needs: `types`, `methods`, `categories/{payments,expenses}`,
`statuses`, `sources`. Plus transaction comments.
*(Analytics — cashflow / pnl / balance / chart — and exports are out of scope.)*

### 2.2 `lead` (CRM) ⬜

CRUD + `{id}/status`, `statuses`, `sources`, `fields`, lead comments.
*(Kanban, bulk, and short variants are out of scope.)*

### 2.3 Quotes & catalog ⬜

`quote` (CRUD, `{id}/status`, `quote_statuses`), `item`, `item_category`, `unit`.

---

## Phase 3 — People / HR

| Group | CLI | Scope |
|---|---|---|
| `participant` (mutate) | extend Phase 1.3 | activate/deactivate, role, position, departments, status, location |
| `recruitment` | `recruitment …` | candidates / applications / vacancies CRUD + `statuses` + `custom-fields` *(kanban / bulk / stats out)* |
| `salaries` | `salary …` | CRUD + `statuses` + `change_status`/`change_data` *(bulk / table out)* |
| `roles` | `role …` | CRUD + `permissions` + `participants` |
| `departments` / `positions` | `department …` / `position …` | CRUD |
| `employment_types` | `employment …` | CRUD + `day_off` *(calendars/exports out)* |
| `vacations` | `vacation …` | scheduled update |

---

## Phase 4 — Content & collaboration

| Group | CLI | Scope |
|---|---|---|
| `chats` | `chat …` | list / search, messages, read, reactions |
| `feed` | `feed …` | posts (+ comments, likes), sidebars |
| `knowledge-base` | `kb …` | directories + documents (CRUD, move, rename, access) |
| `documents` | `doc …` | types, generate, templates |
| `files` | `file …` | upload, company files, volume |

---

## Phase 5 — Reference & admin (build on demand)

- **Reference lookups** (read-only, mirror the `statuses` pattern; consider one `ref <name>`
  umbrella): `currencies`, `colors`, `countries`, `languages`, `services`, `quote_statuses`.
- **Custom fields** (six parallel groups, same shape — ship as `<resource> field …`):
  `task`, `project`, `lead`, `client`, `participant`, `transaction` custom fields.
- **Rates:** `rate_types`, `external_rates`, `participant_rates`, `task_rates`.
- **Admin / platform:** `companies` (+ currency, info, owner, timezones), `subscriptions`,
  `webhooks` (CRUD + connect/disconnect), `settings`, `templates`, `business_units`,
  `payment_recipients`, `recurrent_task`, `checklists` / `checklist_items`, `notifications`.

---

## Out of scope

Deliberately **not** wrapped as CLI commands:

- **Integrations & partner connectors** — `integrations/*` (HubSpot, ClickUp, bank, lead),
  `monday`.
- **Bulk endpoints** — every `*/bulk` (tasks, transactions, clients, leads, salaries,
  recruitment). Agents create entities one call at a time.
- **Imports** — `imports/*`.
- **Exports** — `*_excel`, `*/pdf`, `gantt/pdf`, `export_excel`.
- **Reports & analytics** — `tasks/reports*`, `projects/reports*`,
  `transactions/{cashflow,pnl,balance,chart}*`.
- **`short` pick-list variants** — `/{resource}/short`. (Revisit only as a `--short` flag if a
  real need appears.)
- **Kanban variants** — `*/kanban*`.
- **Activity / action logs** — `task_actions`, `transaction_actions`, `*/actions`.
- **Pagination audit** — not pursuing a cross-cutting pass.
- **UI / runtime infrastructure** — `page-views`, `page-builder`, `menu`, `widgets`,
  `technical_support`, `favicon.ico`, `/` (root), `error`, `public`.

---

## Complete resource inventory (all 72 groups)

Every top-level group in the spec, mapped to its destination — nothing is unaccounted for.

| Group | Destination |
|---|---|
| auth, projects, tasks, iterations | ✅ Shipped |
| task_statuses, task_priorities, project_statuses, iteration_statuses | ✅ Shipped (as `statuses` / `priorities`) |
| workload, clients, participants, task_comments | Phase 1 |
| transactions, transaction_comments, leads, lead_custom_fields*, quotes, quote_statuses, items, item_categories, units | Phase 2 |
| recruitment, salaries, roles, departments, positions, employment_types, vacations | Phase 3 |
| chats, feed, knowledge-base, documents, files | Phase 4 |
| currencies, colors, countries, languages, services | Phase 5 (reference) |
| task_custom_fields, project_custom_fields, client_custom_fields, participant_custom_fields, transaction_custom_fields, lead_custom_fields | Phase 5 (custom fields) |
| rate_types, external_rates, participant_rates, task_rates | Phase 5 (rates) |
| companies, subscriptions, webhooks, settings, templates, business_units, payment_recipients, recurrent_task, checklists, checklist_items, notifications | Phase 5 (admin) |
| integrations, monday, imports | Out of scope (integrations / imports) |
| task_actions, transaction_actions | Out of scope (activity logs) |
| page-views, page-builder, menu, widgets, technical_support, favicon.ico, (root), error, public | Out of scope (UI / infrastructure) |

\* `lead_custom_fields` ships alongside `lead` (Phase 2) but follows the Phase 5 custom-field shape.

---

## Suggested order of execution

1. **Phase 1** — `workload`, `client`, `participant` (read), comments. Biggest agent-friction wins.
2. **Phase 2** — `transaction` and `lead` first, then quotes/catalog.
3. **Phases 3–5** by demand. Reference and custom-field groups are cheap once their umbrella
   conventions exist, so slot them in opportunistically.
