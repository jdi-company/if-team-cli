import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { asNumber, confirmMutation, mergeBody, parseDataInput } from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseDuration, toIsoDateTime } from './duration.js'
import { parseId } from './show.js'

export interface UpdateOptions {
    duration?: string
    startAt?: string
    date?: string
    comment?: string
    participant?: string
    data?: string
    yes?: boolean
    json?: boolean
    ndjson?: boolean
}

export function buildUpdateBody(options: UpdateOptions): Record<string, unknown> {
    const data = parseDataInput(options.data)
    const flags = {
        time: options.duration !== undefined ? parseDuration(options.duration) : undefined,
        start_at: toIsoDateTime(options.startAt ?? options.date),
        comment: options.comment,
        participant_id: asNumber(options.participant, '--participant'),
    }
    return mergeBody(data, flags)
}

interface WorkloadCurrent {
    time?: number | null
    start_at?: string | null
    participant_id?: number | null
    comment?: string | null
}

// PATCH /workload/{id} 500s ("DB Error") on a partial body — the server
// requires time + start_at + participant_id to all be present even though the
// spec marks them optional. Hydrate the unchanged fields from the current
// entry so the user's partial change still produces a complete body.
export function hydrateUpdateBody(
    changes: Record<string, unknown>,
    current: WorkloadCurrent,
): Record<string, unknown> {
    return {
        time: current.time,
        start_at: current.start_at,
        participant_id: current.participant_id,
        ...(current.comment != null ? { comment: current.comment } : {}),
        ...changes,
    }
}

export async function updateCommand(
    input: string | undefined,
    options: UpdateOptions,
): Promise<void> {
    const id = parseId(input)
    const changes = buildUpdateBody(options)

    if (Object.keys(changes).length === 0) {
        throw new CliError('NO_CHANGES', 'No fields to update.', [
            'Pass at least one named flag (e.g. --duration) or --data \'{"…":"…"}\'.',
        ])
    }

    await confirmMutation(`About to update workload ${id} with:`, changes, options)

    startSpinner(`Updating workload ${id}…`)
    let res: unknown
    try {
        // Fetch the current entry so unchanged fields ride along — the API
        // rejects a partial PATCH with a 500 "DB Error".
        const current = await apiRequest<WorkloadCurrent>(`/workload/${id}`)
        const body = hydrateUpdateBody(changes, current)
        res = await apiRequest<unknown>(`/workload/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        })
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Workload "${id}" not found.`)
        }
        throw err
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
    printSuccess(`Workload ${id} updated.`)
}
