import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printKeyValue, printNdjson } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { formatDuration } from './duration.js'

interface WorkloadDetail {
    id: number
    time?: number | null
    start_at?: string | null
    finish_at?: string | null
    comment?: string | null
    amount?: number | string | null
    is_edited?: boolean
    created_at?: string | null
}

export interface ShowOptions {
    json?: boolean
    ndjson?: boolean
}

export function parseId(input: string | undefined): number {
    if (!input) {
        throw new CliError('MISSING_ID', 'Workload ID is required.', [
            'Usage: if-team workload show <id>',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `"${input}" is not a valid workload ID.`, [
            'Workload IDs are positive integers — see `if-team workload list <task_id>`.',
        ])
    }
    return id
}

function truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s
}

export async function showCommand(
    input: string | undefined,
    options: ShowOptions,
): Promise<void> {
    const id = parseId(input)

    startSpinner(`Loading workload ${id}…`)
    let entry: WorkloadDetail
    try {
        entry = await apiRequest<WorkloadDetail>(`/workload/${id}`)
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Workload "${id}" not found.`)
        }
        throw err
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(entry)
        return
    }
    if (isNdjsonMode()) {
        printNdjson(entry)
        return
    }

    printKeyValue([
        ['ID', entry.id],
        ['Time', formatDuration(entry.time)],
        ['Start at', entry.start_at ?? null],
        ['Finish at', entry.finish_at ?? null],
        ['Amount', entry.amount ?? null],
        ['Edited', entry.is_edited ? 'yes' : 'no'],
        ['Created at', entry.created_at ?? null],
        ['Comment', entry.comment ? truncate(entry.comment, 200) : null],
    ])
}
