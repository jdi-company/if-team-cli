import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface ExpiredDate {
    date: string
    show_time?: boolean
    color?: string
}

interface ProjectListItem {
    id: number
    name: string
    type?: { id: number; name: string } | string | null
    start_at?: ExpiredDate | string | null
    responsible?: { id: number; name: string } | null
    tasks?: number | { total?: number } | null
    amount?: number | string | { amount?: string; symbol?: string } | null
}

interface ProjectsResponse {
    total: number
    limit: number
    page: number
    data: ProjectListItem[]
}

export interface ListOptions {
    status?: string
    page?: string
    limit?: string
    json?: boolean
    ndjson?: boolean
}

export function buildQuery(options: ListOptions): Record<string, string | number> {
    const query: Record<string, string | number> = {}
    if (options.status) query['filter[status_id][]'] = options.status
    if (options.page) query.page = options.page
    if (options.limit) query.limit = options.limit
    return query
}

export async function listCommand(options: ListOptions): Promise<void> {
    const query = buildQuery(options)

    startSpinner('Loading projects…')
    let res: ProjectsResponse
    try {
        res = await apiRequest<ProjectsResponse>('/projects', { query })
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
        { header: 'ID', get: (p) => p.id },
        { header: 'NAME', get: (p) => p.name },
        {
            header: 'TYPE',
            get: (p) =>
                typeof p.type === 'string' ? p.type : (p.type?.name ?? ''),
        },
        {
            header: 'START_AT',
            get: (p) => {
                const raw = typeof p.start_at === 'string' ? p.start_at : p.start_at?.date
                return raw ? raw.slice(0, 10) : ''
            },
        },
        { header: 'RESPONSIBLE', get: (p) => p.responsible?.name ?? '' },
    ])

    const shown = res.data.length
    console.log(`\nShowing ${shown} of ${res.total} (page ${res.page}, limit ${res.limit})`)
}
