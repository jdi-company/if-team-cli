import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface TaskStatus {
    id: number
    name: string
    color?: string | null
    final_status?: boolean | null
    rework_status?: boolean | null
}

export interface StatusesOptions {
    json?: boolean
    ndjson?: boolean
}

export async function statusesCommand(_options: StatusesOptions): Promise<void> {
    startSpinner('Loading task statuses…')
    let statuses: TaskStatus[]
    try {
        statuses = await apiRequest<TaskStatus[]>('/task_statuses')
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(statuses)
        return
    }

    if (isNdjsonMode()) {
        for (const s of statuses) printNdjson(s)
        return
    }

    printTable(statuses, [
        { header: 'ID', get: (s) => s.id },
        { header: 'NAME', get: (s) => s.name },
        { header: 'COLOR', get: (s) => s.color ?? '' },
        { header: 'FINAL', get: (s) => (s.final_status ? 'yes' : '') },
        { header: 'REWORK', get: (s) => (s.rework_status ? 'yes' : '') },
    ])
}
