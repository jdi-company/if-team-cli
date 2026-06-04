import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { formatDuration } from './duration.js'

export interface WorkloadListItem {
    id: number
    time?: number | null
    start_at?: string | null
    finish_at?: string | null
    comment?: string | null
    amount?: number | string | null
    is_edited?: boolean
    created_at?: string | null
}

// GET /workload returns a paginated envelope, not the bare array the spec
// advertises: { currentPage, data, nextPage, time_plan, time_spent }.
interface WorkloadListResponse {
    currentPage?: number
    nextPage?: number | null
    time_plan?: number | null
    time_spent?: number | null
    data?: WorkloadListItem[]
}

export interface ListOptions {
    page?: string
    limit?: string
    json?: boolean
    ndjson?: boolean
}

export function parseTaskId(input: string | undefined): number {
    if (!input) {
        throw new CliError('MISSING_ID', 'Task ID is required.', [
            'Usage: if-team workload list <task_id>',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `"${input}" is not a valid task ID.`, [
            'Task IDs are positive integers — see `if-team task list`.',
        ])
    }
    return id
}

export function buildQuery(
    taskId: number,
    options: ListOptions,
): Record<string, string | number> {
    const query: Record<string, string | number> = { task_id: taskId }
    if (options.page) query.page = options.page
    if (options.limit) query.limit = options.limit
    return query
}

function truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s
}

export async function listCommand(
    taskIdInput: string | undefined,
    options: ListOptions,
): Promise<void> {
    const taskId = parseTaskId(taskIdInput)
    const query = buildQuery(taskId, options)

    startSpinner('Loading workload entries…')
    let res: WorkloadListResponse | WorkloadListItem[]
    try {
        res = await apiRequest<WorkloadListResponse | WorkloadListItem[]>('/workload', { query })
    } finally {
        stopSpinner()
    }

    // Tolerate both the documented bare array and the live paginated envelope.
    const envelope: WorkloadListResponse = Array.isArray(res) ? { data: res } : res
    const entries = envelope.data ?? []

    if (isJsonMode()) {
        printJson(res)
        return
    }

    if (isNdjsonMode()) {
        for (const item of entries) printNdjson(item)
        return
    }

    printTable(entries, [
        { header: 'ID', get: (e) => e.id },
        { header: 'TIME', get: (e) => formatDuration(e.time) },
        { header: 'START_AT', get: (e) => (e.start_at ?? '').slice(0, 16).replace('T', ' ') },
        { header: 'EDITED', get: (e) => (e.is_edited ? 'yes' : '') },
        { header: 'COMMENT', get: (e) => (e.comment ? truncate(e.comment, 40) : '') },
    ])

    const totalSpent =
        envelope.time_spent !== undefined && envelope.time_spent !== null
            ? ` · total tracked ${formatDuration(envelope.time_spent)}`
            : ''
    console.log(`\nShowing ${entries.length} entries${totalSpent}`)
}
