import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface ClientRole {
    id: number
    name?: string | { name?: string } | null
    order?: number | null
    color?: string | { id?: number; name?: string; color?: string } | null
}

// The live API wraps roles in `{ data, count }`; tolerate a bare array too.
interface RolesResponse {
    data?: ClientRole[]
    count?: number
}

export interface RolesOptions {
    json?: boolean
    ndjson?: boolean
}

function roleName(n: ClientRole['name']): string {
    if (!n) return ''
    return typeof n === 'string' ? n : (n.name ?? '')
}

function colorHex(c: ClientRole['color']): string {
    if (!c) return ''
    if (typeof c === 'string') return c
    return c.color ?? c.name ?? ''
}

export async function rolesCommand(_options: RolesOptions): Promise<void> {
    startSpinner('Loading client roles…')
    let res: RolesResponse | ClientRole[]
    try {
        res = await apiRequest<RolesResponse | ClientRole[]>('/clients/roles')
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(res)
        return
    }

    const roles = Array.isArray(res) ? res : (res.data ?? [])

    if (isNdjsonMode()) {
        for (const r of roles) printNdjson(r)
        return
    }

    printTable(roles, [
        { header: 'ID', get: (r) => r.id },
        { header: 'NAME', get: (r) => roleName(r.name) },
        { header: 'COLOR', get: (r) => colorHex(r.color) },
        { header: 'ORDER', get: (r) => r.order ?? '' },
    ])
}
