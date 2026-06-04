import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode, isQuietMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseTaskId } from './list.js'

export interface FinishOptions {
    task?: string
    json?: boolean
    ndjson?: boolean
}

export async function finishCommand(options: FinishOptions): Promise<void> {
    const taskId = parseTaskId(options.task)

    startSpinner('Stopping timer…')
    let res: unknown
    try {
        res = await apiRequest<unknown>('/workload/finish', {
            method: 'POST',
            query: { task_id: taskId },
            // Bodyless POST 400s ("Unexpected end of JSON input"); send {}.
            body: '{}',
        })
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
    if (isQuietMode()) return
    printSuccess(`Timer stopped for task ${taskId}.`)
}
