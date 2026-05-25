import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
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
    overrun?: boolean
}

interface IterationListItem {
    id: number
    name: string
    project_id?: number
    amount?: IterationAmount | null
    hours?: IterationHours | null
    start_at?: ExpiredDate | null
    finish_at?: ExpiredDate | null
    status?: { id: number; name: string; color?: string } | null
}

function formatAmount(a: IterationAmount | null | undefined): string {
    if (!a) return ''
    const value = a.amount ?? ''
    const symbol = a.symbol ?? ''
    if (value === '' && symbol === '') return ''
    return `${value}${symbol ? ' ' + symbol : ''}`
}

function formatHours(h: IterationHours | null | undefined): string {
    if (!h || h.time_plan === null || h.time_plan === undefined) return ''
    const total = Math.max(0, Math.round(h.time_plan))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    return `${hours}:${String(minutes).padStart(2, '0')}`
}

interface IterationsResponse {
    total: number
    data: IterationListItem[]
    page?: number
    limit?: number
}

export interface ListOptions {
    status?: string
    page?: string
    limit?: string
    json?: boolean
    ndjson?: boolean
}

export function parseProjectId(input: string | undefined): number {
    if (!input) {
        throw new CliError('MISSING_ID', 'Project ID is required.', [
            'Usage: if-team iteration list <project_id>',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `"${input}" is not a valid project ID.`, [
            'Project IDs are positive integers — see `if-team project list`.',
        ])
    }
    return id
}

export function buildQuery(
    projectId: number,
    options: ListOptions,
): Record<string, string | number> {
    const query: Record<string, string | number> = { project_id: projectId }
    if (options.status) query['filter[status_id][]'] = options.status
    if (options.page) query.page = options.page
    if (options.limit) query.limit = options.limit
    return query
}

export async function listCommand(
    projectIdInput: string | undefined,
    options: ListOptions,
): Promise<void> {
    const projectId = parseProjectId(projectIdInput)
    const query = buildQuery(projectId, options)

    startSpinner('Loading iterations…')
    let res: IterationsResponse
    try {
        res = await apiRequest<IterationsResponse>('/iterations', { query })
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(res)
        return
    }

    if (isNdjsonMode()) {
        for (const item of res.data) printNdjson(item)
        return
    }

    printTable(res.data, [
        { header: 'ID', get: (i) => i.id },
        { header: 'NAME', get: (i) => i.name },
        { header: 'STATUS', get: (i) => i.status?.name ?? '' },
        { header: 'START_AT', get: (i) => (i.start_at?.date ?? '').slice(0, 10) },
        { header: 'FINISH_AT', get: (i) => (i.finish_at?.date ?? '').slice(0, 10) },
        { header: 'AMOUNT', get: (i) => formatAmount(i.amount) },
        { header: 'HOURS', get: (i) => formatHours(i.hours) },
    ])

    const shown = res.data.length
    const pageInfo =
        res.page !== undefined && res.limit !== undefined
            ? ` (page ${res.page}, limit ${res.limit})`
            : ''
    console.log(`\nShowing ${shown} of ${res.total}${pageInfo}`)
}
