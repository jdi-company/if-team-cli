import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printKeyValue, printNdjson } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface TaskDetail {
    id: number
    number?: number | string
    name: string
    status?: { id: number; name: string; color?: string } | null
    priority?: { id: number; name: string; color?: string } | null
    project?: { id: number; name: string } | null
    start_at?: string | null
    description?: string | null
    responsibles?: Array<{ id: number; name: string }> | null
    time_spent?: number | null
    time_plan?: number | null
}

interface TaskPageResponse {
    task: TaskDetail
}

export interface ShowOptions {
    json?: boolean
    ndjson?: boolean
}

export function parseId(input: string | undefined): number {
    if (!input) {
        throw new CliError('MISSING_ID', 'Task ID is required.', [
            'Usage: if-team task show <id>',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `"${input}" is not a valid task ID.`, [
            'Task IDs are positive integers — see `if-team task list`.',
        ])
    }
    return id
}

function truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s
}

function formatSeconds(seconds: number | null | undefined): string | null {
    if (seconds === null || seconds === undefined) return null
    const total = Math.max(0, Math.round(seconds))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    return `${h}:${String(m).padStart(2, '0')}`
}

export async function showCommand(input: string | undefined, options: ShowOptions): Promise<void> {
    const id = parseId(input)

    startSpinner(`Loading task ${id}…`)
    let response: TaskPageResponse
    try {
        response = await apiRequest<TaskPageResponse>(`/tasks/${id}`)
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Task "${id}" not found.`)
        }
        throw err
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(response)
        return
    }

    if (isNdjsonMode()) {
        printNdjson(response)
        return
    }

    const task = response.task
    const responsibles = task.responsibles?.map((r) => r.name).join(', ') ?? null
    const description = task.description ? truncate(task.description, 200) : null

    printKeyValue([
        ['ID', task.id],
        ['Name', task.name],
        ['Status', task.status?.name ?? null],
        ['Priority', task.priority?.name ?? null],
        ['Project', task.project ? `${task.project.name} (#${task.project.id})` : null],
        ['Start at', task.start_at ?? null],
        ['Responsibles', responsibles && responsibles.length > 0 ? responsibles : null],
        ['Time spent', formatSeconds(task.time_spent)],
        ['Time plan', formatSeconds(task.time_plan)],
        ['Description', description],
    ])
}
