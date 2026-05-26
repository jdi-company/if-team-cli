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
    comment?: string
    status?: string
    startAt?: string
    finishAt?: string
    hours?: string
    amount?: string
    exchangeRate?: string
    toProjectAmount?: boolean
    data?: string
    yes?: boolean
    json?: boolean
    ndjson?: boolean
}

export function buildUpdateBody(options: UpdateOptions): Record<string, unknown> {
    const data = parseDataInput(options.data)
    const flags = {
        name: options.name,
        comment: options.comment,
        status_id: asNumber(options.status, '--status'),
        start_at: options.startAt,
        finish_at: options.finishAt,
        hours: asNumber(options.hours, '--hours'),
        amount: asNumber(options.amount, '--amount'),
        exchange_rate: asNumber(options.exchangeRate, '--exchange-rate'),
        to_project_amount: options.toProjectAmount,
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

    await confirmMutation(`About to update iteration ${id} with:`, body, options)

    startSpinner(`Updating iteration ${id}…`)
    let res: unknown
    try {
        res = await apiRequest<unknown>(`/iterations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        })
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Iteration "${id}" not found.`)
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
    printSuccess(`Iteration ${id} updated.`)
}
