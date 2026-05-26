# Contributing to if-team-cli

Thanks for taking the time to contribute! This document covers the workflow
for proposing changes, the conventions you'll need to follow, and a few
gotchas worth knowing up front.

## Before you start

- Read [AGENTS.md](./AGENTS.md) — the short rules sheet for this repo.
- Skim [CODEBASE.md](./CODEBASE.md) — a 2000-token orientation map.
- Glance at [docs/patterns.md](./docs/patterns.md) for command patterns and
  [docs/auth.md](./docs/auth.md) for the auth model.

## Local setup

```bash
git clone https://github.com/jdi-company/if-team-cli.git
cd if-team-cli
nvm use            # Node >= 24 (see .nvmrc)
npm install
npm run build
node dist/index.js --help
```

Common scripts:

| Script | Purpose |
|---|---|
| `npm run dev` | tsc watch mode |
| `npm run type-check` | type-check without emitting |
| `npm test` | vitest (single run) |
| `npm run test:watch` | vitest watch |
| `npm run sync:skill` | regenerate `skills/if-team-cli/SKILL.md` from `src/lib/skills/content.ts` |
| `npm run check:skill-sync` | verify the generated SKILL.md matches `content.ts` (CI runs this) |

## Pull request workflow

1. **Branch from `main`.** Use a descriptive name (`feat/iteration-clone`,
   `fix/auth-jwt-refresh`).
2. **Write tests** alongside the code (`*.test.ts` next to the module).
3. **Run `npm run type-check && npm test`** before pushing.
4. **Open a PR with a conventional-commit title** (see below). The Semantic
   Pull Request check enforces this.
5. **CI must be green** (tests, skill-sync) before review.

### Conventional commit titles

PR titles drive automated releases via `semantic-release`. Use one of:

- `feat: …` — new user-facing feature (minor bump)
- `fix: …` — bug fix (patch bump)
- `docs: …` — documentation only
- `chore: …` — tooling, deps, no user-facing change
- `refactor: …` — internal change, no behavior change
- `test: …` — tests only
- `perf: …` — performance improvement (patch bump)
- `feat!: …` or `BREAKING CHANGE:` in body — major bump

Scope is optional but encouraged: `feat(task): support bulk delete`.

## SKILL.md

The agent skill ("how to drive the CLI") is generated from TypeScript code,
not hand-edited as a markdown file.

- **Source of truth:** `src/lib/skills/content.ts` — exports `SKILL_NAME`,
  `SKILL_DESCRIPTION`, `SKILL_COMPATIBILITY`, `SKILL_CONTENT`.
- **Generator:** `src/lib/skills/create-installer.ts` (`generateSkillFile()`)
  assembles frontmatter (with `version` + `license` pulled from `package.json`)
  and the body.
- **Generated file:** `skills/if-team-cli/SKILL.md` — committed for discovery
  (e.g. for `gh skill publish`) but never edited directly.
- **End-user installers:** `src/lib/skills/index.ts` registers writers for
  Claude Code, Codex, Copilot, Cursor, Gemini, and the universal `.agents`
  dir. Users run `if-team skill install <agent>` to drop the SKILL.md into
  their home directory; `scripts/postinstall.js` keeps already-installed
  copies fresh on CLI upgrade.

**Workflow for changing the skill:**

1. Edit `src/lib/skills/content.ts`.
2. Run `npm run sync:skill` (builds, then regenerates `skills/if-team-cli/SKILL.md`).
3. Commit both files. CI (`check-skill-sync.yml`) fails if they drift.

Contributor-facing skills (e.g. a "how to add a new command" skill targeted
at agents working *on* this repo) would live under `.claude/skills/` and/or
`.agents/skills/` — none exist yet.

## Releases

Releases are fully automated. Pushing to `main` triggers
`.github/workflows/release.yml`, which:

1. Runs build + tests
2. Lets `semantic-release` analyze commits since the last release
3. Bumps version, updates `CHANGELOG.md`, tags, publishes to npm with
   provenance (OIDC), and creates a GitHub release

You should not bump versions or edit `CHANGELOG.md` by hand.

## Reporting bugs

Open an issue at <https://github.com/jdi-company/if-team-cli/issues> with:

- CLI version (`if-team --version`)
- Node version (`node --version`)
- OS
- Steps to reproduce + observed vs. expected output
- If the API misbehaves, attach `-vvv` output (redact tokens first)
