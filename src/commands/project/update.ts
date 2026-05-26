import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import {
    asNumber,
    confirmMutation,
    mergeBody,
    parseDataInput,
} from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseId } from './show.js'

export interface UpdateOptions {
    name?: string
    description?: string
    status?: string
    responsible?: string
    type?: string
    startAt?: string
    finishAt?: string
    amount?: string
    client?: string[]
    data?: string
    yes?: boolean
    json?: boolean
    ndjson?: boolean
}

export function buildUpdateBody(options: UpdateOptions): Record<string, unknown> {
    const data = parseDataInput(options.data)
    const flags = {
        name: options.name,
        description: options.description,
        status_id: asNumber(options.status, '--status'),
        responsible_id: asNumber(options.responsible, '--responsible'),
        type: options.type,
        start_at: options.startAt,
        finish_at: options.finishAt,
        amount: asNumber(options.amount, '--amount'),
        client_ids: options.client,
    }
    return mergeBody(data, flags)
}

export async function updateCommand(
    input: string | undefined,
    options: UpdateOptions,
): Promise<void> {
    const id = parseId(input)
    const body = buildUpdateBody(options)

    if (Object.keys(body).length === 0) {
        throw new CliError('NO_CHANGES', 'No fields to update.', [
            'Pass at least one named flag (e.g. --name) or --data \'{"…":"…"}\'.',
        ])
    }

    await confirmMutation(`About to update project ${id} with:`, body, options)

    startSpinner(`Updating project ${id}…`)
    let res: unknown
    try {
        res = await apiRequest<unknown>(`/projects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        })
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Project "${id}" not found.`)
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
    printSuccess(`Project ${id} updated.`)
}
