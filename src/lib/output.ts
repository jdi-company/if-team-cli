import chalk from 'chalk'
import type { CliError } from './errors.js'
import { isQuietMode } from './global-args.js'

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
    if (isQuietMode()) return
    console.log(chalk.green(`✔ ${message}`))
}

export interface TableColumn<Row> {
    header: string
    get: (row: Row) => string | number | null | undefined
}

export function printTable<Row>(rows: Row[], columns: TableColumn<Row>[]): void {
    if (rows.length === 0) {
        console.log(chalk.dim('(no results)'))
        return
    }

    const cells = rows.map((row) =>
        columns.map((col) => {
            const v = col.get(row)
            return v === null || v === undefined ? '' : String(v)
        }),
    )

    const widths = columns.map((col, i) =>
        Math.max(col.header.length, ...cells.map((row) => row[i].length)),
    )

    const pad = (s: string, w: number, isLast: boolean) => (isLast ? s : s.padEnd(w))
    const lastIdx = columns.length - 1

    console.log(
        chalk.bold(columns.map((col, i) => pad(col.header, widths[i], i === lastIdx)).join('  ')),
    )

    for (const row of cells) {
        console.log(row.map((cell, i) => pad(cell, widths[i], i === lastIdx)).join('  '))
    }
}

export function printKeyValue(entries: Array<[string, string | number | null | undefined]>): void {
    const width = Math.max(...entries.map(([k]) => k.length))
    for (const [k, v] of entries) {
        const value = v === null || v === undefined ? chalk.dim('—') : String(v)
        console.log(`${chalk.bold(k.padEnd(width))}  ${value}`)
    }
}
