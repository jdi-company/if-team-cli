# if-team CLI

A command-line interface for [if.team](https://if.team) — an all-in-one ERP for creative and tech companies.

## Installation

```bash
npm install -g @jdi/if-team-cli
```

## Setup

Authenticate with your if.team API token:

```bash
if-team auth login --token <your-token>
```

Or set the environment variable:

```bash
export IF_TEAM_TOKEN="your-token"
```

`IF_TEAM_TOKEN` takes priority over the stored token.

```bash
if-team auth status   # check authentication status
if-team auth logout   # remove stored credentials
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
