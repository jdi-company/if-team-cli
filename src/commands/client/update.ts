import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { asNumber, confirmMutation, mergeBody, parseDataInput } from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseId } from './show.js'

export interface UpdateOptions {
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
    yes?: boolean
    json?: boolean
    ndjson?: boolean
}

export function buildUpdateBody(options: UpdateOptions): Record<string, unknown> {
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

interface ClientCurrent {
    name?: { name?: string | null } | string | null
    type?: string | null
    email?: string | null
    phone?: string | null
    comment?: string | null
    address?: string | null
    country_id?: number | null
    iban?: string | null
    bank?: string | null
    registration_number?: string | null
    telegram?: string | null
    whatsapp?: string | null
    date_of_birth?: string | null
    responsibles?: Array<{ id?: number } | number> | null
    roles?: Array<{ id?: number } | number> | null
    files?: Array<{ id?: number } | number> | null
}

function idsOf(arr: ClientCurrent['responsibles']): Array<number | string> | undefined {
    if (!Array.isArray(arr)) return undefined
    return arr
        .map((x) => (typeof x === 'object' && x !== null ? x.id : x))
        .filter((v): v is number => v != null)
}

// PATCH /clients/{id} silently resets every field the body omits back to its
// default (e.g. a partial `{ phone }` flipped `type` from legal to individual).
// The spec marks all fields optional, but the API treats the PATCH as a full
// replace. Hydrate the current entry's values so the user's partial change still
// produces a complete body — the read-modify-write variant of the trap.
export function hydrateUpdateBody(
    changes: Record<string, unknown>,
    current: ClientCurrent,
): Record<string, unknown> {
    const currentName = typeof current.name === 'object' && current.name !== null
        ? current.name.name
        : current.name
    const base: Record<string, unknown> = {
        name: currentName,
        type: current.type,
        email: current.email,
        phone: current.phone,
        comment: current.comment,
        address: current.address,
        country_id: current.country_id,
        iban: current.iban,
        bank: current.bank,
        registration_number: current.registration_number,
        telegram: current.telegram,
        whatsapp: current.whatsapp,
        date_of_birth: current.date_of_birth,
    }
    const responsibleIds = idsOf(current.responsibles)
    if (responsibleIds) base.responsible_ids = responsibleIds
    const roleIds = idsOf(current.roles)
    if (roleIds) base.client_role_ids = roleIds
    const fileIds = idsOf(current.files)
    if (fileIds) base.file_ids = fileIds

    return { ...base, ...changes }
}

export async function updateCommand(
    input: string | undefined,
    options: UpdateOptions,
): Promise<void> {
    const id = parseId(input)
    const changes = buildUpdateBody(options)

    if (Object.keys(changes).length === 0) {
        throw new CliError('NO_CHANGES', 'No fields to update.', [
            'Pass at least one named flag (e.g. --name) or --data \'{"…":"…"}\'.',
        ])
    }

    await confirmMutation(`About to update client ${id} with:`, changes, options)

    startSpinner(`Updating client ${id}…`)
    let res: unknown
    try {
        // Fetch the current entry so unchanged fields ride along — a partial
        // PATCH resets every omitted field to its default.
        const current = await apiRequest<ClientCurrent>(`/clients/${id}`)
        const body = hydrateUpdateBody(changes, current)
        res = await apiRequest<unknown>(`/clients/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        })
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Client "${id}" not found.`)
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
    printSuccess(`Client ${id} updated.`)
}
