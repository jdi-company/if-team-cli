import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface ExpiredDate {
    date: string
    show_time?: boolean
    color?: string
}

interface TaskListItem {
    id: number
    number?: number | string
    name: { name?: string } | string
    status?: { id: number; name: string; color?: string } | null
    priority?: { id: number; name: string; color?: string } | null
    project?: { id: number; name: string } | null
    start_at?: ExpiredDate | null
    finish_at?: ExpiredDate | null
    responsibles?: Array<{ id: number; name: string }> | null
}

function taskName(n: TaskListItem['name']): string {
    if (typeof n === 'string') return n
    return n?.name ?? ''
}

interface TasksResponse {
    total: number
    limit: number
    page: number
    data: TaskListItem[]
}

export interface ListOptions {
    status?: string
    project?: string
    startAt?: string
    finishAt?: string
    assignee?: string
    page?: string
    limit?: string
    json?: boolean
    ndjson?: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function validateDate(flag: string, value: string | undefined): void {
    if (value && !DATE_RE.test(value)) {
        throw new CliError(
            'INVALID_OPTIONS',
            `${flag} must be a date in YYYY-MM-DD format (got "${value}").`,
        )
    }
}

export function buildQuery(options: ListOptions): Record<string, string | number> {
    validateDate('--start-at', options.startAt)
    validateDate('--finish-at', options.finishAt)

    const query: Record<string, string | number> = {}
    if (options.project) query['filter[project_id][]'] = options.project
    if (options.status) query['filter[status_id][]'] = options.status
    if (options.startAt) {
        query['filter[start_at][0]'] = options.startAt
        query['filter[start_at][1]'] = options.startAt
    }
    if (options.finishAt) {
        query['filter[finish_at][0]'] = options.finishAt
        query['filter[finish_at][1]'] = options.finishAt
    }
    if (options.assignee) query['filter[responsible_id][]'] = options.assignee
    if (options.page) query.page = options.page
    if (options.limit) query.limit = options.limit
    return query
}

export async function listCommand(options: ListOptions): Promise<void> {
    if (options.assignee === 'me') {
        const { getCurrentUserId } = await import('../../lib/user.js')
        options = { ...options, assignee: String(getCurrentUserId()) }
    }
    const query = buildQuery(options)

    startSpinner('Loading tasks…')
    let res: TasksResponse
    try {
        res = await apiRequest<TasksResponse>('/tasks', { query })
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
        { header: 'ID', get: (t) => t.id },
        { header: 'NAME', get: (t) => taskName(t.name) },
        { header: 'STATUS', get: (t) => t.status?.name ?? '' },
        { header: 'PRIORITY', get: (t) => t.priority?.name ?? '' },
        { header: 'PROJECT', get: (t) => t.project?.name ?? '' },
        { header: 'START_AT', get: (t) => t.start_at?.date ?? '' },
        { header: 'FINISH_AT', get: (t) => t.finish_at?.date ?? '' },
        {
            header: 'RESPONSIBLES',
            get: (t) => t.responsibles?.map((r) => r.name).join(', ') ?? '',
        },
    ])

    const shown = res.data.length
    console.log(`\nShowing ${shown} of ${res.total} (page ${res.page}, limit ${res.limit})`)
}
