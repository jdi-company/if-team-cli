import { apiRequest } from '../../lib/api/client.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printNdjson, printTable } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface IterationStatus {
    id: number
    name: string
    color?: string | { id?: number; name?: string; color?: string } | null
}

export interface StatusesOptions {
    json?: boolean
    ndjson?: boolean
}

function colorHex(c: IterationStatus['color']): string {
    if (!c) return ''
    if (typeof c === 'string') return c
    return c.color ?? c.name ?? ''
}

export async function statusesCommand(_options: StatusesOptions): Promise<void> {
    startSpinner('Loading iteration statuses…')
    let statuses: IterationStatus[]
    try {
        statuses = await apiRequest<IterationStatus[]>('/iteration_statuses')
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(statuses)
        return
    }

    if (isNdjsonMode()) {
        for (const s of statuses) printNdjson(s)
        return
    }

    printTable(statuses, [
        { header: 'ID', get: (s) => s.id },
        { header: 'NAME', get: (s) => s.name },
        { header: 'COLOR', get: (s) => colorHex(s.color) },
    ])
}
