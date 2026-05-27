# Auth Model

if.team has a **two-tier auth system**. Understanding this is critical when adding new commands.

## Tier 1 — API Key (`apikey` header)

Created in the if.team admin dashboard per company. Sent as `apikey: <token>` header.

- **Works on:** all business/resource endpoints (projects, tasks, finance, CRM, etc.)
- **Does NOT work on:** `/auth/*` endpoints and `/companies` — those require Bearer JWT.
- **Requires:** `company_id` query parameter on virtually every request.
- **Validation probe:** `GET /subscriptions/current?company_id=<id>` — safe verification without Bearer auth.

## Tier 2 — Bearer JWT (`Authorization: Bearer` header)

Obtained via `POST /auth/login` with email + password. Short-lived; auto-refreshed using the refresh token via `POST /auth/refresh` (sends refresh token as Bearer header, no request body).

- **Works on:** all endpoints including `/auth/*` and `/companies`.
- **Requires:** `company_id` query parameter on business endpoints.
- **Auto-refresh:** `apiRequest()` checks expiry 30 s early and refreshes silently.

## `auth login` flow

### Email / password mode (`if-team auth login`)

1. Prompt email (visible) and password (silent — no echo, enterprise standard).
2. `POST /auth/login` → access token + refresh token.
3. If `companies` absent from response, call `GET /companies` with the JWT.
4. User selects company from numbered list (auto-selects if only one).
5. Resolve the company-scoped **participant id** via `findParticipantIdByEmail()` (`GET /participants?company_id=<id>` + match by email). Needed because `response.user.id` is the *global* account id, but task filters like `filter[responsible_id][]` expect the per-company participant id. Stored as `userId` in credentials — used by `--assignee me`. Lookup failure leaves `userId` undefined; `--assignee me` then errors with `NO_USER_IDENTITY`.
6. Store JWT + company metadata + participant id in OS keychain.

### API key mode (`if-team auth login --key`)

The `--key` flag accepts an optional value. Three behaviours:

| Invocation | Behaviour |
|---|---|
| `--key` (no value) | Prompts silently for the key — **recommended**, nothing in shell history |
| `--key <value>` | Uses the inline value; prints a history warning |
| `IF_TEAM_TOKEN` env var set, no `--key` | Uses env var as the API key (session-only, never stored) |

Steps (all three paths share the same flow once the key is resolved):

1. Resolve API key (silent prompt, inline value, or env var).
2. Note displayed: email/password needed once to discover companies, will not be stored.
3. Prompt email and password (same silent prompt).
4. `POST /auth/login` → temporary JWT (used only for company discovery).
5. `GET /companies` with temporary JWT → company list.
6. User selects company.
7. Validate API key: `GET /subscriptions/current?company_id=<id>` with `apikey` header.
8. **Discard JWT** — store only API key + company metadata in OS keychain.

## Auth precedence in `apiRequest()`

1. `IF_TEAM_TOKEN` env var → API key mode, session-only, never stored to disk.
2. Stored credentials from keychain → API key or JWT (whichever was used at login).
3. No credentials → throws `CliError('NO_TOKEN', …)`.

## `company_id` resolution when `IF_TEAM_TOKEN` is set

`IF_TEAM_TOKEN` alone is not enough — every business endpoint also requires `company_id`. Resolution order:

1. `IF_TEAM_COMPANY_ID` env var — explicit, fully env-based (no keychain needed).
2. `companyId` from stored keychain credentials — convenient fallback when a prior `auth login` exists.
3. Neither → throws `CliError('NO_COMPANY', …)` with a hint to set `IF_TEAM_COMPANY_ID`.

Example (fully env-based, no stored credentials required):

```bash
IF_TEAM_TOKEN=<key> IF_TEAM_COMPANY_ID=123 if-team task list
```

## `company_id` injection

`apiRequest()` automatically appends `?company_id=<stored>` to every request unless the caller already provides it in the `query` option. Never omit `company_id` in manual `fetch()` calls outside `apiRequest()`.

## Credential storage

Credentials are stored as a JSON blob in the **OS keychain** via `@napi-rs/keyring`:

- macOS: Keychain Access (service: `if-team-cli`, account: `credentials`)
- Windows: Credential Manager
- Linux: libsecret / Secret Service

If the keychain is unavailable, falls back to `~/.config/if-team-cli/credentials.json` with `chmod 600` and a warning. The config file (`config.json` in the same dir) holds only `baseUrl` — never a secret.

- **API key credentials stored:** `{ mode, key, companyId, companyName }`
- **JWT credentials stored:** `{ mode, accessToken, refreshToken, userId?, email, name, companyId, companyName }`. `userId` is the **company-scoped participant id** (e.g. `1001` in company `200`), not the global account id (e.g. `42`). Optional because credentials saved before this resolution shipped lack it — `--assignee me` then prompts a re-login.
- **Never stored:** password (discarded after login), temporary JWT in API key flow, the global user id (we throw it away in favor of the participant id).
