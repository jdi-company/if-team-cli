import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

// The list item wraps `name` in an i18n object and `country` in a label object.
interface ClientName {
    name?: string | null
}

interface ClientCountry {
    id?: number
    label?: string | null
    icon?: string | null
}

interface ClientListItem {
    id: number
    name?: ClientName | string | null
    type?: string | { name?: string } | null
    email?: string | null
    phone?: string | null
    comment?: string | null
    country?: ClientCountry | string | null
}

// The spec documents `{ data, total }`; tolerate a bare array just in case.
interface ClientsResponse {
    total?: number
    data?: ClientListItem[]
    page?: number
    limit?: number
}

const CLIENT_TYPES = ['individual', 'legal'] as const
export type ClientType = (typeof CLIENT_TYPES)[number]

export interface ListOptions {
    type?: string
    name?: string
    email?: string
    phone?: string
    comment?: string
    country?: string
    page?: string
    limit?: string
    json?: boolean
    ndjson?: boolean
}

// `GET /clients` 422s without a `type` param — surface it as a required flag.
export function parseType(input: string | undefined): ClientType {
    if (!input) {
        throw new CliError('INVALID_OPTIONS', '--type is required (individual | legal).', [
            'The clients API rejects a list request without a type filter.',
            'Example: if-team client list --type legal',
        ])
    }
    if (!(CLIENT_TYPES as readonly string[]).includes(input)) {
        throw new CliError('INVALID_OPTIONS', `--type must be "individual" or "legal" (got "${input}").`)
    }
    return input as ClientType
}

export function buildQuery(options: ListOptions): Record<string, string | number> {
    const query: Record<string, string | number> = { type: parseType(options.type) }
    if (options.name) query['filter[name]'] = options.name
    if (options.email) query['filter[email]'] = options.email
    if (options.phone) query['filter[phone]'] = options.phone
    if (options.comment) query['filter[comment]'] = options.comment
    if (options.country) query['filter[country_id][]'] = options.country
    if (options.page) query.page = options.page
    if (options.limit) query.limit = options.limit
    return query
}

function clientName(n: ClientListItem['name']): string {
    if (!n) return ''
    return typeof n === 'string' ? n : (n.name ?? '')
}

function clientType(t: ClientListItem['type']): string {
    if (!t) return ''
    return typeof t === 'string' ? t : (t.name ?? '')
}

function clientCountry(c: ClientListItem['country']): string {
    if (!c) return ''
    return typeof c === 'string' ? c : (c.label ?? '')
}

export async function listCommand(options: ListOptions): Promise<void> {
    const query = buildQuery(options)

    startSpinner('Loading clients…')
    let res: ClientsResponse | ClientListItem[]
    try {
        res = await apiRequest<ClientsResponse | ClientListItem[]>('/clients', { query })
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(res)
        return
    }

    const items = Array.isArray(res) ? res : (res.data ?? [])

    if (isNdjsonMode()) {
        for (const item of items) printNdjson(item)
        return
    }

    printTable(items, [
        { header: 'ID', get: (c) => c.id },
        { header: 'NAME', get: (c) => clientName(c.name) },
        { header: 'TYPE', get: (c) => clientType(c.type) },
        { header: 'EMAIL', get: (c) => c.email ?? '' },
        { header: 'PHONE', get: (c) => c.phone ?? '' },
        { header: 'COUNTRY', get: (c) => clientCountry(c.country) },
    ])

    const total = Array.isArray(res) ? items.length : (res.total ?? items.length)
    const pageInfo =
        !Array.isArray(res) && res.page !== undefined && res.limit !== undefined
            ? ` (page ${res.page}, limit ${res.limit})`
            : ''
    console.log(`\nShowing ${items.length} of ${total}${pageInfo}`)
}
