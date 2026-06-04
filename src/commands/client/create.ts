import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode, isQuietMode } from '../../lib/global-args.js'
import { asNumber, mergeBody, parseDataInput } from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

export interface CreateOptions {
    name?: string
    type?: string
    email?: string
    phone?: string
    comment?: string
    address?: string
    country?: string
    iban?: string
    bank?: string
    registrationNumber?: string
    telegram?: string
    whatsapp?: string
    dateOfBirth?: string
    responsible?: string[]
    role?: string[]
    lead?: string
    data?: string
    json?: boolean
    ndjson?: boolean
}

export function buildCreateBody(options: CreateOptions): Record<string, unknown> {
    const data = parseDataInput(options.data)
    const flags = {
        name: options.name,
        type: options.type,
        email: options.email,
        phone: options.phone,
        comment: options.comment,
        address: options.address,
        country_id: asNumber(options.country, '--country'),
        iban: options.iban,
        bank: options.bank,
        registration_number: options.registrationNumber,
        telegram: options.telegram,
        whatsapp: options.whatsapp,
        date_of_birth: options.dateOfBirth,
        responsible_ids: options.responsible,
        client_role_ids: options.role,
        lead_id: asNumber(options.lead, '--lead'),
    }
    return mergeBody(data, flags)
}

interface CreatedResponse {
    id?: number
    [key: string]: unknown
}

export async function createCommand(options: CreateOptions): Promise<void> {
    const body = buildCreateBody(options)

    startSpinner('Creating client…')
    let res: CreatedResponse
    try {
        res = await apiRequest<CreatedResponse>('/clients', {
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
    if (isQuietMode()) {
        if (res.id !== undefined) console.log(res.id)
        return
    }
    printSuccess(res.id ? `Client created (ID: ${res.id}).` : 'Client created.')
}
