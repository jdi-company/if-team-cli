import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode, isQuietMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseTaskId } from './list.js'

export interface CommentOptions {
    task?: string
    comment?: string
    json?: boolean
    ndjson?: boolean
}

export async function commentCommand(options: CommentOptions): Promise<void> {
    const taskId = parseTaskId(options.task)

    if (options.comment === undefined || options.comment === '') {
        throw new CliError('INVALID_OPTIONS', '--comment <text> is required.', [
            'Example: if-team workload comment --task 42 --comment "Pairing on the bug"',
        ])
    }

    startSpinner('Adding comment…')
    let res: unknown
    try {
        res = await apiRequest<unknown>('/workload/comment', {
            method: 'POST',
            query: { task_id: taskId },
            body: JSON.stringify({ comment: options.comment }),
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
    printSuccess(`Comment added to the active timer for task ${taskId}.`)
}
