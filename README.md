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

## Quick start

```bash
if-team --help              # list all commands
if-team <command> --help    # help for a specific command

# Read-only essentials
if-team task list --assignee me --finish-at 2026-05-26   # MY tasks due on a date
if-team task list --project 12 --status 3                # filter by project + status
if-team project list                                     # first 20 projects
if-team project show 1234                                # full details

# Create a task
if-team task create --project 12 --name "Wire up auth" --priority 2
```

> Add `--json` to any command for machine-readable output, `--ndjson` for one line per item (great for piping into `jq` or an LLM).

For the **full command catalogue** (every resource, every flag, every example), see [COMMANDS.md](./COMMANDS.md).

## Use it from your AI assistant

The CLI ships with a skill file that teaches Claude Code, Cursor, Codex, Copilot, Gemini, and any universal-skill-compatible agent how to call these commands on your behalf. After installing it, asking your agent *"what are my tasks for today?"* runs one targeted command instead of dumping the whole task list.

```bash
if-team skill list                            # supported agents + install state
if-team skill install claude-code             # install for Claude Code (~/.claude/skills/)
if-team skill install cursor --local          # install into the current project (./.cursor/skills/)
if-team skill update claude-code              # refresh after upgrading the CLI
if-team skill uninstall cursor                # remove
```

Supported agents: `claude-code`, `codex`, `copilot`, `cursor`, `gemini`, `universal`.

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
rules. For deeper context: [COMMANDS.md](./COMMANDS.md) (full command reference),
[AGENTS.md](./AGENTS.md) (rules sheet), [CODEBASE.md](./CODEBASE.md) (repo map),
[docs/patterns.md](./docs/patterns.md) (command patterns),
[docs/auth.md](./docs/auth.md) (auth model).

## Credits

This project was inspired by the [Doist/todoist-cli](https://github.com/Doist/todoist-cli)
repository — its command patterns, flag conventions, skill plumbing, and
release workflow shaped how this CLI is structured. Huge thanks to the Doist
team for publishing it as open source.
