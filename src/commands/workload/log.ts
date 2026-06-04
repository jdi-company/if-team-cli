import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode, isQuietMode } from '../../lib/global-args.js'
import { asNumber, mergeBody, parseDataInput } from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { getCurrentUserId } from '../../lib/user.js'
import { parseDuration, toIsoDateTime } from './duration.js'
import { parseTaskId } from './list.js'

export interface LogOptions {
    task?: string
    duration?: string
    date?: string
    startAt?: string
    comment?: string
    participant?: string
    data?: string
    json?: boolean
    ndjson?: boolean
}

// Builds the POST /workload body. `participant_id` is left undefined when the
// user passes `--participant me` (or omits it); the caller fills it from the
// logged-in user as a post-merge default so a value supplied via --data wins.
export function buildLogBody(options: LogOptions): Record<string, unknown> {
    const data = parseDataInput(options.data)
    const participant =
        options.participant && options.participant !== 'me'
            ? asNumber(options.participant, '--participant')
            : undefined
    const flags = {
        time: options.duration !== undefined ? parseDuration(options.duration) : undefined,
        start_at: toIsoDateTime(options.startAt ?? options.date),
        comment: options.comment,
        participant_id: participant,
    }
    const body = mergeBody(data, flags)

    // `start_at` is required by the API; default a finished entry to "now"
    // when the user gave only a duration. A value from --data still wins.
    if (body.start_at === undefined) body.start_at = new Date().toISOString()
    return body
}

interface CreatedResponse {
    id?: number
    [key: string]: unknown
}

export async function logCommand(options: LogOptions): Promise<void> {
    const taskId = parseTaskId(options.task)
    const body = buildLogBody(options)

    // `participant_id` is required; resolve the logged-in user when neither a
    // flag nor --data provided one.
    if (body.participant_id === undefined) body.participant_id = getCurrentUserId()

    if (body.time === undefined) {
        throw new CliError('INVALID_OPTIONS', 'A duration is required to log workload.', [
            'Example: if-team workload log --task 42 --duration 2h30m',
            'Or pass --data \'{"time": 9000}\' (seconds).',
        ])
    }

    startSpinner('Logging workload…')
    let res: CreatedResponse
    try {
        res = await apiRequest<CreatedResponse>('/workload', {
            method: 'POST',
            query: { task_id: taskId },
            body: JSON.stringify(body),
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
    if (isQuietMode()) {
        if (res.id !== undefined) console.log(res.id)
        return
    }
    printSuccess(res.id ? `Workload logged (ID: ${res.id}).` : 'Workload logged.')
}
