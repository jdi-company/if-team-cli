import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface ProjectStatus {
    id: number
    name: string
    color?: string | null
}

export interface StatusesOptions {
    json?: boolean
    ndjson?: boolean
}

export async function statusesCommand(_options: StatusesOptions): Promise<void> {
    startSpinner('Loading project statuses…')
    let statuses: ProjectStatus[]
    try {
        statuses = await apiRequest<ProjectStatus[]>('/project_statuses')
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
    ])
}
