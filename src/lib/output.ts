import chalk from 'chalk'
import type { CliError } from './errors.js'

export function formatError(err: CliError): string {
    const lines = [chalk.red(`✖ ${err.message}`)]
    if (err.hints.length > 0) {
        for (const hint of err.hints) {
            lines.push(chalk.dim(`  → ${hint}`))
        }
    }
    return lines.join('\n')
}

export function formatErrorJson(err: CliError | string, message?: string): string {
    if (typeof err === 'string') {
        return JSON.stringify({ error: { code: err, message: message ?? err } })
    }
    return JSON.stringify({ error: { code: err.code, message: err.message, hints: err.hints } })
}

export function printJson(data: unknown): void {
    console.log(JSON.stringify(data, null, 2))
}

export function printNdjson(data: unknown): void {
    console.log(JSON.stringify(data))
}

export function printSuccess(message: string): void {
    console.log(chalk.green(`✔ ${message}`))
}
