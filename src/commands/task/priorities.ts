import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface TaskPriority {
    id: number
    name: string
    color?: string | null
}

export interface PrioritiesOptions {
    json?: boolean
    ndjson?: boolean
}

export async function prioritiesCommand(_options: PrioritiesOptions): Promise<void> {
    startSpinner('Loading task priorities…')
    let priorities: TaskPriority[]
    try {
        priorities = await apiRequest<TaskPriority[]>('/task_priorities')
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(priorities)
        return
    }

    if (isNdjsonMode()) {
        for (const p of priorities) printNdjson(p)
        return
    }

    printTable(priorities, [
        { header: 'ID', get: (p) => p.id },
        { header: 'NAME', get: (p) => p.name },
        { header: 'COLOR', get: (p) => p.color ?? '' },
    ])
}
