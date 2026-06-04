import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printKeyValue, printNdjson } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface ClientCountry {
    id?: number
    label?: string | null
    icon?: string | null
}

interface ClientDetail {
    id: number
    name?: { name?: string | null } | string | null
    type?: string | { name?: string } | null
    email?: string | null
    phone?: string | null
    comment?: string | null
    address?: string | null
    iban?: string | null
    bank?: string | null
    country?: ClientCountry | string | null
    individuals?: unknown[]
}

export interface ShowOptions {
    json?: boolean
    ndjson?: boolean
}

export function parseId(input: string | undefined): number {
    if (!input) {
        throw new CliError('MISSING_ID', 'Client ID is required.', [
            'Usage: if-team client show <id>',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `"${input}" is not a valid client ID.`, [
            'Client IDs are positive integers — see `if-team client list --type legal`.',
        ])
    }
    return id
}

function clientName(n: ClientDetail['name']): string | null {
    if (!n) return null
    return typeof n === 'string' ? n : (n.name ?? null)
}

function clientType(t: ClientDetail['type']): string | null {
    if (!t) return null
    return typeof t === 'string' ? t : (t.name ?? null)
}

function clientCountry(c: ClientDetail['country']): string | null {
    if (!c) return null
    return typeof c === 'string' ? c : (c.label ?? null)
}

export async function showCommand(
    input: string | undefined,
    options: ShowOptions,
): Promise<void> {
    const id = parseId(input)

    startSpinner(`Loading client ${id}…`)
    let client: ClientDetail
    try {
        client = await apiRequest<ClientDetail>(`/clients/${id}`)
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Client "${id}" not found.`)
        }
        throw err
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(client)
        return
    }

    if (isNdjsonMode()) {
        printNdjson(client)
        return
    }

    printKeyValue([
        ['ID', client.id],
        ['Name', clientName(client.name)],
        ['Type', clientType(client.type)],
        ['Email', client.email ?? null],
        ['Phone', client.phone ?? null],
        ['Country', clientCountry(client.country)],
        ['Address', client.address ?? null],
        ['IBAN', client.iban ?? null],
        ['Bank', client.bank ?? null],
        ['Comment', client.comment ?? null],
    ])
}
