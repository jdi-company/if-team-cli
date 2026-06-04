import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printKeyValue, printNdjson } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { formatDuration } from './duration.js'

interface TodayTask {
    id?: number
    name?: string | { name?: string } | null
}

interface TodayResponse {
    total_time?: number | null
    time_spent?: number | null
    start_at?: string | null
    task?: TodayTask | null
}

export interface TodayOptions {
    json?: boolean
    ndjson?: boolean
}

function taskName(task: TodayTask | null | undefined): string | null {
    if (!task) return null
    const n = task.name
    if (typeof n === 'string') return n
    return n?.name ?? null
}

export async function todayCommand(options: TodayOptions): Promise<void> {
    startSpinner("Loading today's workload…")
    let res: TodayResponse
    try {
        res = await apiRequest<TodayResponse>('/workload/today')
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(res)
        return
    }
    if (isNdjsonMode()) {
        printNdjson(res)
        return
    }

    const name = taskName(res.task)
    printKeyValue([
        ['Total time', formatDuration(res.total_time)],
        ['Time spent', formatDuration(res.time_spent)],
        ['Started at', res.start_at ?? null],
        ['Task', res.task?.id ? `${res.task.id}${name ? ` — ${name}` : ''}` : (name ?? null)],
    ])
}
