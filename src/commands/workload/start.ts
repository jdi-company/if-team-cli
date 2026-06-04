import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode, isQuietMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseTaskId } from './list.js'

export interface StartOptions {
    task?: string
    // Commander's --stop / --no-stop. The API requires the `stop` query param;
    // it tells the server whether to stop any other running timer first.
    stop?: boolean
    json?: boolean
    ndjson?: boolean
}

export async function startCommand(options: StartOptions): Promise<void> {
    const taskId = parseTaskId(options.task)

    startSpinner('Starting timer…')
    let res: unknown
    try {
        res = await apiRequest<unknown>('/workload/start', {
            method: 'POST',
            query: { task_id: taskId, stop: options.stop ? 'true' : 'false' },
            // The endpoint takes no fields, but it 400s ("Unexpected end of JSON
            // input") if the JSON body is absent. Send an empty object.
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
    printSuccess(`Timer started for task ${taskId}.`)
}
