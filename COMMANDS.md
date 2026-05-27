# `if.team` — Full Command Reference

Complete catalogue of every command exposed by the `if-team` CLI. The [README](./README.md) shows only the minimum needed to get started — this file is the long-form reference.

Run `if-team <command> --help` for inline help on any command.

## Global flags

| Flag | Description |
|---|---|
| `--json` | Output as pretty JSON (machine-readable) |
| `--ndjson` | Single line of JSON, or one line per item for lists |
| `-q, --quiet` | Suppress success messages. `create` still prints the bare ID for scripting. |
| `-v` | Verbose; repeat up to `-vvvv` (request/response logs at `-vv`, body at `-vvv`) |
| `--no-spinner` | Disable loading animations |

## Authentication

```bash
if-team auth login --key                          # silent API-key prompt (recommended)
if-team auth login --key <api-key>                # ⚠ inline — appears in shell history
if-team auth login                                # email + password (interactive)
if-team auth status                               # show current auth + active company
if-team auth logout                               # invalidate session, clear keychain
```

### Environment variables

| Var | Purpose |
|---|---|
| `IF_TEAM_TOKEN` | API key. Takes priority over stored credentials. Never written to disk. |
| `IF_TEAM_COMPANY_ID` | Target company for the session. Falls back to the company stored by `auth login`. Business endpoints fail with `NO_COMPANY` if neither is set. |
| `IF_TEAM_API_URL` | Override the API base URL (default `https://api.demo.if.team`). |

## Projects

### Browse

```bash
if-team project list                              # first page (default 20 items)
if-team project list --status 3 --limit 50        # filter + page size
if-team project list --page 2
if-team project statuses                          # available status IDs
if-team project show 1234                         # full details
if-team project 1234                              # shorthand for `show`
```

### Mutate

```bash
if-team project create --name "New site" --status 5 --responsible 10 \
  --type fixed --amount 5000 --currency 2 --client 7

if-team project update 1234 --status 3 --finish-at 2026-06-30 --yes
if-team project update 1234 --data '{"custom_fields":[{"id":1,"value":"X"}]}' --yes

if-team project delete 1234 --yes
if-team project delete 1234 --transaction-deletion-method COMPLETE_REMOVAL --yes
```

## Tasks

### Browse

```bash
if-team task list                                 # first page
if-team task list --project 12 --status 3
if-team task list --finish-at 2026-05-26          # tasks due on a date (YYYY-MM-DD)
if-team task list --start-at 2026-05-26 --finish-at 2026-05-31
if-team task list --assignee me --finish-at 2026-05-26   # MY tasks due on a date
if-team task list --assignee 1001                 # tasks where user 1001 is responsible
if-team task statuses                             # status IDs (for --status)
if-team task priorities                           # priority IDs
if-team task show 4567                            # full details
if-team task 4567 --ndjson                        # compact JSON for piping
```

> `--assignee me` resolves to the currently authenticated user. JWT login only — in API-key mode pass the numeric id explicitly.

### Mutate

```bash
if-team task create --project 12 --name "Wire up auth" --priority 2 \
  --status 3 --time-plan 7200 --participant 5

# Task start_at / finish_at use ISO 8601 datetime (not plain YYYY-MM-DD).
if-team task update 4567 --status 6 \
  --start-at 2026-06-01T09:00:00.000Z \
  --finish-at 2026-06-15T18:00:00.000Z --yes
# (The API requires start_at on task updates — include --start-at if you hit a 422.)

if-team task delete 4567 --yes
if-team task delete 4567 --no-stop --yes          # leave active time tracking running
```

## Iterations

### Browse

```bash
if-team iteration list 12                         # iterations for project 12 (required)
if-team iteration list 12 --status 1 --limit 50
if-team iteration statuses                        # available iteration status IDs
if-team iteration show 345                        # full details for one iteration
if-team iteration 345                             # shorthand for `show`
```

### Mutate

```bash
if-team iteration create --project 12 --name "2026/Q3/S1" \
  --start-at 2026-07-01 --finish-at 2026-07-14 --hours 80 --to-project-amount

if-team iteration update 345 --status 2300 --yes
if-team iteration delete 345 --yes
```

## Skill installer

Install the `if-team` skill into your AI coding assistant (Claude Code, Cursor, Codex, Copilot, Gemini, or the universal `~/.agents/` layout). The skill teaches the agent these commands so it can run them on your behalf.

```bash
if-team skill list                                # supported agents + install state
if-team skill install claude-code                 # ~/.claude/skills/if-team-cli/
if-team skill install cursor --local              # ./.cursor/skills/if-team-cli/ (this project)
if-team skill install universal                   # ~/.agents/skills/if-team-cli/
if-team skill install claude-code --force         # overwrite existing
if-team skill update claude-code                  # refresh content
if-team skill update                              # refresh every installed skill
if-team skill uninstall cursor                    # remove
```

Supported agents: `claude-code`, `codex`, `copilot`, `cursor`, `gemini`, `universal`.

## Piping

`create` and `update` accept the full DTO via `--data` (JSON literal, `@file.json`, or `-` for stdin). Named flags override fields from `--data`.

```bash
echo '{"name":"My task","client_ids":["7"]}' | if-team task create --project 12 --data -
if-team task update 4567 --data @patch.json --yes
id=$(if-team task create --project 12 --name "X" --quiet)   # bare ID on stdout
if-team task list --ndjson | jq -c 'select(.status_id == 3)'
```

## Confirmation prompts

`update` and `delete` prompt for confirmation by default — pass `--yes` to skip. Non-interactive contexts (`--json` / `--ndjson` mode, piped stdin, CI) require `--yes` explicitly, otherwise the command throws `CONFIRMATION_REQUIRED`.

## Errors

CLI errors are typed (`CliError` with a `code`). Common codes:

- `NOT_FOUND` — resource id does not exist (or 404)
- `NO_COMPANY` — no active company resolved (set `IF_TEAM_COMPANY_ID` or re-login)
- `AUTH_FAILED` / `INVALID_TOKEN` — token missing, invalid, or expired
- `NO_USER_IDENTITY` — `--assignee me` invoked without a stored participant id (re-login under JWT mode, or pass `--assignee <id>` explicitly)
- `CONFIRMATION_REQUIRED` — destructive command needs `--yes` in non-interactive mode

In `--json` / `--ndjson` mode, errors are emitted as JSON to stderr with `{ "error": { "code", "message", "hints" } }`.
