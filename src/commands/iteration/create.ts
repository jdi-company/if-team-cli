import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode, isQuietMode } from '../../lib/global-args.js'
import {
    asNumber,
    mergeBody,
    parseDataInput,
} from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

export interface CreateOptions {
    project?: string
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
    json?: boolean
    ndjson?: boolean
}

export function parseProjectId(input: string | undefined): number {
    if (input === undefined || input === '') {
        throw new CliError('MISSING_ID', '--project <id> is required to create an iteration.', [
            'Example: if-team iteration create --project 12 --name "Sprint 1"',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `--project "${input}" is not a valid ID.`)
    }
    return id
}

export function buildCreateBody(options: CreateOptions): Record<string, unknown> {
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

interface CreatedResponse {
    id?: number
    [key: string]: unknown
}

export async function createCommand(options: CreateOptions): Promise<void> {
    const projectId = parseProjectId(options.project)
    const body = buildCreateBody(options)

    startSpinner('Creating iteration…')
    let res: CreatedResponse
    try {
        res = await apiRequest<CreatedResponse>('/iterations', {
            method: 'POST',
            query: { project_id: projectId },
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
    printSuccess(res.id ? `Iteration created (ID: ${res.id}).` : 'Iteration created.')
}
