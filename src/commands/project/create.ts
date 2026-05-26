import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import {
    asNumber,
    collectStrings,
    mergeBody,
    parseDataInput,
} from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

export interface CreateOptions {
    name?: string
    description?: string
    status?: string
    responsible?: string
    type?: string
    startAt?: string
    finishAt?: string
    amount?: string
    currency?: string
    client?: string[]
    data?: string
    json?: boolean
    ndjson?: boolean
}

export interface CollectFlagsResult {
    [key: string]: unknown
}

export function buildCreateBody(options: CreateOptions): Record<string, unknown> {
    const data = parseDataInput(options.data)
    const flags: CollectFlagsResult = {
        name: options.name,
        description: options.description,
        status_id: asNumber(options.status, '--status'),
        responsible_id: asNumber(options.responsible, '--responsible'),
        type: options.type,
        start_at: options.startAt,
        finish_at: options.finishAt,
        amount: asNumber(options.amount, '--amount'),
        currency_id: asNumber(options.currency, '--currency'),
        client_ids: options.client,
    }
    return mergeBody(data, flags)
}

interface CreatedResponse {
    id?: number
    [key: string]: unknown
}

export async function createCommand(options: CreateOptions): Promise<void> {
    const body = buildCreateBody(options)

    startSpinner('Creating project…')
    let res: CreatedResponse
    try {
        res = await apiRequest<CreatedResponse>('/projects', {
            method: 'POST',
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
    printSuccess(res.id ? `Project created (ID: ${res.id}).` : 'Project created.')
}
