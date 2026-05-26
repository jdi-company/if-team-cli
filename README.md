<p align="center">
  <img src="./icons/if-team-cli.png" alt="if-team CLI" width="160" />
</p>

# if.team | CLI

[![npm version](https://img.shields.io/npm/v/if-team-cli.svg)](https://www.npmjs.com/package/if-team-cli)
[![Tests](https://github.com/jdi-company/if-team-cli/actions/workflows/test.yml/badge.svg)](https://github.com/jdi-company/if-team-cli/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/if-team-cli.svg)](https://www.npmjs.com/package/if-team-cli)

A command-line interface for [if.team](https://if.team) — an all-in-one ERP for creative and tech companies.

> ⚠️ **Unofficial package.** This CLI is not published or maintained by the **if.team**. It is built and maintained independently by **JAST DEVELOP InT OÜ**, but we are in active contact with the **if.team** and aim to keep the CLI aligned with the official API.

## Installation

```bash
npm install -g if-team-cli
```

## Authentication

### API key (recommended)

Get your API key from the if.team admin dashboard, then run:

```bash
if-team auth login --key
```

You will be prompted for the API key **silently** (no echo), then once for your email and password to discover your companies — they are not stored. Only the API key is saved to the OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret).

You can also pass the key inline, but it will appear in your shell history:

```bash
if-team auth login --key <your-api-key>   # ⚠ stored in ~/.zsh_history
```

### Email / password

```bash
if-team auth login
```

Prompts for email and password interactively. The password prompt is silent (no echo) — enterprise standard, same as `sudo`. Tokens are stored securely in the OS keychain.

### Environment variable (CI / scripts)

```bash
export IF_TEAM_TOKEN="your-api-key"
export IF_TEAM_COMPANY_ID="123"
```

`IF_TEAM_TOKEN` takes priority over stored credentials and is never written to disk — ideal for automation.

`IF_TEAM_COMPANY_ID` sets the target company for the session. If omitted, the company stored by `auth login` is used as a fallback. If neither is available, business endpoints will fail with a `NO_COMPANY` error.

### Auth commands

```bash
if-team auth status   # show authentication status, mode, and company
if-team auth logout   # invalidate session and remove stored credentials
```

## Usage

```bash
if-team --help              # list all commands
if-team <command> --help    # help for a specific command
```

### Global flags

| Flag | Description |
|---|---|
| `--json` | Output as pretty JSON (machine-readable) |
| `--ndjson` | Output as a single line of JSON (or one line per item for lists) |
| `-q, --quiet` | Suppress success messages |
| `-v` | Verbose output (repeat up to `-vvvv`) |
| `--no-spinner` | Disable loading animations |

### Browsing projects and tasks

Read-only commands for everyday workflows. All accept `--json` (pretty) and
`--ndjson` (compact / one line per item).

```bash
# Projects
if-team project list                                # first page (default 20 items)
if-team project list --status 3 --limit 50          # filter + page size
if-team project list --page 2
if-team project statuses                            # available status IDs
if-team project show 1234                           # full details
if-team project 1234                                # same as `show` (implicit view)

# Tasks
if-team task list                                   # first page
if-team task list --project 12 --status 3
if-team task list --finish-at 2026-05-26            # tasks due on a date (YYYY-MM-DD)
if-team task list --start-at 2026-05-26 --finish-at 2026-05-31
if-team task statuses                               # status IDs (for --status)
if-team task priorities                             # priority IDs
if-team task show 4567                              # full details
if-team task 4567 --ndjson                          # compact JSON for piping

# Iterations
if-team iteration list 12                           # iterations for project 12 (required)
if-team iteration list 12 --status 1 --limit 50
if-team iteration statuses                          # available iteration status IDs
if-team iteration show 345                          # full details for one iteration
if-team iteration 345                               # same as `show` (implicit view)
```

Use `--ndjson` on `show` to get one compact JSON line — handy when streaming
context to an LLM or piping through `jq`.

### Creating, updating, and deleting

Every resource supports `create` (POST), `update <id>` (PATCH), and
`delete <id>` (DELETE). `create` and `update` accept common fields as
**named flags** and the full DTO as `--data` (JSON literal, `@file.json`, or
`-` for stdin). Named flags override fields from `--data`.

`update` and `delete` prompt for confirmation by default — pass `--yes` to
skip (required in non-interactive contexts: `--json` mode, piped stdin, CI).

```bash
# Projects
if-team project create --name "New site" --status 5 --responsible 10 \
  --type fixed --amount 5000 --currency 2 --client 7
if-team project update 1234 --status 3 --finish-at 2026-06-30 --yes
if-team project update 1234 --data '{"custom_fields":[{"id":1,"value":"X"}]}' --yes

# Tasks
if-team task create --project 12 --name "Wire up auth" --priority 2 \
  --status 3 --time-plan 7200 --participant 5
# Task start_at / finish_at use ISO 8601 datetime (not plain YYYY-MM-DD).
if-team task update 4567 --status 6 \
  --start-at 2026-06-01T09:00:00.000Z \
  --finish-at 2026-06-15T18:00:00.000Z --yes
# (The API requires start_at on task updates — include --start-at if you hit a 422.)

# Iterations
if-team iteration create --project 12 --name "2026/Q3/S1" \
  --start-at 2026-07-01 --finish-at 2026-07-14 --hours 80 --to-project-amount
if-team iteration update 345 --status 2300 --yes
```

Pipe JSON in from another command or a file:

```bash
echo '{"name":"My task","client_ids":["7"]}' | if-team task create --project 12 --data -
if-team task update 4567 --data @patch.json --yes
```

Delete a resource:

```bash
# Projects
if-team project delete 1234 --yes
if-team project delete 1234 --transaction-deletion-method COMPLETE_REMOVAL --yes

# Tasks
if-team task delete 4567 --yes
if-team task delete 4567 --no-stop --yes   # leave active time tracking running

# Iterations
if-team iteration delete 345 --yes
```

`delete` prints `About to delete <resource> <id>.` and asks `Continue? [y/N]`
unless `--yes` is passed. In `--json` / `--ndjson` mode the prompt is skipped
and you must pass `--yes` explicitly. Task delete sends the API-required
`stop` query as `true` by default; pass `--no-stop` to keep an active timer
running.

## Local Development

```bash
git clone https://github.com/jdi-company/if-team-cli.git
cd if-team-cli
npm install
npm run build
node dist/index.js --help
```

```bash
npm run dev          # watch mode — recompiles on change
npm run type-check   # type-check without emitting
npm test             # run tests
```

## API Spec

The if.team OpenAPI 3.0 spec is stored at `docs/api-spec.json`. A GitHub Action
checks for changes daily and opens a pull request automatically when the upstream
API changes.

To refresh manually:

```bash
curl -s https://api.demo.if.team/api-json -o docs/api-spec.json
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the PR workflow and conventional-commit
rules. For deeper context: [AGENTS.md](./AGENTS.md) (rules sheet),
[CODEBASE.md](./CODEBASE.md) (repo map), [docs/patterns.md](./docs/patterns.md)
(command patterns), [docs/auth.md](./docs/auth.md) (auth model).

## Credits

This project was inspired by the [Doist/todoist-cli](https://github.com/Doist/todoist-cli)
repository — its command patterns, flag conventions, skill plumbing, and
release workflow shaped how this CLI is structured. Huge thanks to the Doist
team for publishing it as open source.
