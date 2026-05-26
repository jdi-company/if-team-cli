import { readFileSync } from 'node:fs'
import chalk from 'chalk'
import { CliError } from './errors.js'
import { isJsonMode, isNdjsonMode } from './global-args.js'
import { promptText } from './prompt.js'

// ─── --data parsing ──────────────────────────────────────────────────────────
// Accepts a literal JSON string, `@path/to/file.json`, or `-` (stdin).

export function parseDataInput(input: string | undefined): Record<string, unknown> {
    if (input === undefined || input === '') return {}

    let raw: string
    if (input === '-') {
        try {
            raw = readFileSync(0, 'utf8')
        } catch {
            throw new CliError('INVALID_OPTIONS', 'Failed to read --data from stdin.')
        }
    } else if (input.startsWith('@')) {
        const path = input.slice(1)
        try {
            raw = readFileSync(path, 'utf8')
        } catch (err) {
            throw new CliError(
                'INVALID_OPTIONS',
                `Could not read --data file "${path}": ${(err as Error).message}.`,
            )
        }
    } else {
        raw = input
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch (err) {
        throw new CliError(
            'INVALID_OPTIONS',
            `--data is not valid JSON: ${(err as Error).message}.`,
        )
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new CliError('INVALID_OPTIONS', '--data must be a JSON object.')
    }

    return parsed as Record<string, unknown>
}

// ─── Body merge ──────────────────────────────────────────────────────────────
// Named flags override values from --data so the CLI can fix typos in JSON.
// Skips undefined flag values (Commander leaves unset options undefined).

export function mergeBody(
    dataBody: Record<string, unknown>,
    flagBody: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = { ...dataBody }
    for (const [k, v] of Object.entries(flagBody)) {
        if (v !== undefined) out[k] = v
    }
    return out
}

// ─── Confirm prompt ──────────────────────────────────────────────────────────

export async function confirmMutation(
    summaryTitle: string,
    body: Record<string, unknown>,
    options: { yes?: boolean },
): Promise<void> {
    if (options.yes) return
    if (isJsonMode() || isNdjsonMode()) {
        throw new CliError(
            'CONFIRMATION_REQUIRED',
            'Confirmation is required for this operation.',
            ['Pass --yes to skip the prompt in JSON / non-interactive mode.'],
        )
    }
    if (!process.stdin.isTTY) {
        throw new CliError(
            'CONFIRMATION_REQUIRED',
            'Confirmation is required for this operation.',
            ['stdin is not a TTY — pass --yes to skip the prompt.'],
        )
    }

    console.log(chalk.bold(summaryTitle))
    if (Object.keys(body).length === 0) {
        console.log(chalk.dim('  (empty body)'))
    } else {
        for (const [k, v] of Object.entries(body)) {
            console.log(`  ${chalk.bold(k)}: ${formatValue(v)}`)
        }
    }

    const answer = await promptText('Continue? [y/N]: ')
    if (!/^y(es)?$/i.test(answer)) {
        throw new CliError('ABORTED', 'Aborted by user.')
    }
}

export async function confirmDeletion(
    summary: string,
    options: { yes?: boolean },
): Promise<void> {
    if (options.yes) return
    if (isJsonMode() || isNdjsonMode()) {
        throw new CliError(
            'CONFIRMATION_REQUIRED',
            'Confirmation is required for this operation.',
            ['Pass --yes to skip the prompt in JSON / non-interactive mode.'],
        )
    }
    if (!process.stdin.isTTY) {
        throw new CliError(
            'CONFIRMATION_REQUIRED',
            'Confirmation is required for this operation.',
            ['stdin is not a TTY — pass --yes to skip the prompt.'],
        )
    }

    console.log(chalk.bold(summary))

    const answer = await promptText('Continue? [y/N]: ')
    if (!/^y(es)?$/i.test(answer)) {
        throw new CliError('ABORTED', 'Aborted by user.')
    }
}

function formatValue(v: unknown): string {
    if (v === null) return 'null'
    if (typeof v === 'string') return v
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v)
}

// ─── Coercion helpers used by command flag builders ──────────────────────────

export function asNumber(value: string | undefined, flag: string): number | undefined {
    if (value === undefined) return undefined
    const n = Number(value)
    if (!Number.isFinite(n)) {
        throw new CliError('INVALID_OPTIONS', `${flag} must be a number (got "${value}").`)
    }
    return n
}

export function collectStrings(value: string, prev: string[] | undefined): string[] {
    return [...(prev ?? []), value]
}

export function collectNumbers(flag: string) {
    return (value: string, prev: number[] | undefined): number[] => {
        const n = Number(value)
        if (!Number.isFinite(n)) {
            throw new CliError(
                'INVALID_OPTIONS',
                `${flag} must be a number (got "${value}").`,
            )
        }
        return [...(prev ?? []), n]
    }
}
