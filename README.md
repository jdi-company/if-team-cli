# if-team CLI

A command-line interface for [if.team](https://if.team) — an all-in-one ERP for creative and tech companies.

## Installation

```bash
npm install -g @jdi/if-team-cli
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
| `--json` | Output as JSON (machine-readable) |
| `--ndjson` | Output as newline-delimited JSON |
| `-q, --quiet` | Suppress success messages |
| `-v` | Verbose output (repeat up to `-vvvv`) |
| `--no-spinner` | Disable loading animations |

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

See [AGENTS.md](./AGENTS.md) for development guidelines and [CODEBASE.md](./CODEBASE.md)
for the repository map.
