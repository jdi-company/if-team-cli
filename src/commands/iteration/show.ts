import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printKeyValue, printNdjson } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface ExpiredDate {
    date?: string | null
    show_time?: boolean
}

interface IterationAmount {
    amount?: string | number | null
    symbol?: string | null
    total?: string | number | null
    totalSymbol?: string | null
}

interface IterationHours {
    time_plan?: number | null
    time_spent?: number | null
}

interface IterationDetail {
    id: number
    name: string
    project_id?: number
    amount?: IterationAmount | number | string | null
    exchange_rate?: number | null
    hours?: IterationHours | number | null
    start_at?: ExpiredDate | string | null
    finish_at?: ExpiredDate | string | null
    comment?: string | null
    status?: { id: number; name: string; color?: string } | null
    tasks?: unknown[]
    sub_iterations?: unknown[]
}

export interface ShowOptions {
    json?: boolean
    ndjson?: boolean
}

export function parseId(input: string | undefined): number {
    if (!input) {
        throw new CliError('MISSING_ID', 'Iteration ID is required.', [
            'Usage: if-team iteration show <id>',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `"${input}" is not a valid iteration ID.`, [
            'Iteration IDs are positive integers — see `if-team iteration list <project_id>`.',
        ])
    }
    return id
}

function truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s
}

function dateOnly(s: ExpiredDate | string | null | undefined): string | null {
    const raw = typeof s === 'string' ? s : s?.date
    if (!raw) return null
    return raw.slice(0, 10)
}

function formatAmount(a: IterationDetail['amount']): string | null {
    if (a === null || a === undefined) return null
    if (typeof a === 'string' || typeof a === 'number') return String(a)
    const value = a.amount ?? ''
    const symbol = a.symbol ?? ''
    if (value === '' && symbol === '') return null
    return `${value}${symbol ? ' ' + symbol : ''}`
}

function formatHoursSeconds(seconds: number | null | undefined): string | null {
    if (seconds === null || seconds === undefined) return null
    const total = Math.max(0, Math.round(seconds))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    return `${h}:${String(m).padStart(2, '0')}`
}

function formatHours(h: IterationDetail['hours']): string | null {
    if (h === null || h === undefined) return null
    if (typeof h === 'number') return formatHoursSeconds(h)
    const plan = formatHoursSeconds(h.time_plan)
    const spent = formatHoursSeconds(h.time_spent)
    if (plan === null && spent === null) return null
    return `${spent ?? '0:00'} / ${plan ?? '—'}`
}

export async function showCommand(
    input: string | undefined,
    options: ShowOptions,
): Promise<void> {
    const id = parseId(input)

    startSpinner(`Loading iteration ${id}…`)
    let iteration: IterationDetail
    try {
        iteration = await apiRequest<IterationDetail>(`/iterations/${id}`)
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Iteration "${id}" not found.`)
        }
        throw err
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(iteration)
        return
    }

    if (isNdjsonMode()) {
        printNdjson(iteration)
        return
    }

    const comment = iteration.comment ? truncate(iteration.comment, 200) : null

    printKeyValue([
        ['ID', iteration.id],
        ['Name', iteration.name],
        ['Status', iteration.status?.name ?? null],
        ['Start at', dateOnly(iteration.start_at)],
        ['Finish at', dateOnly(iteration.finish_at)],
        ['Amount', formatAmount(iteration.amount)],
        ['Hours (spent / plan)', formatHours(iteration.hours)],
        ['Comment', comment],
    ])
}
