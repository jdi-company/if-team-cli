import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { printJson, printKeyValue, printNdjson } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

interface ProjectDetail {
    id: number
    name: string
    type?: { id: number; name: string } | string | null
    status?: { id: number; name: string; color?: string } | null
    start_at?: string | null
    finish_at?: string | null
    amount?: number | string | null
    description?: string | null
    responsible?: { id: number; name: string } | null
}

export interface ShowOptions {
    json?: boolean
    ndjson?: boolean
}

export function parseId(input: string | undefined): number {
    if (!input) {
        throw new CliError('MISSING_ID', 'Project ID is required.', [
            'Usage: if-team project show <id>',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `"${input}" is not a valid project ID.`, [
            'Project IDs are positive integers — see `if-team project list`.',
        ])
    }
    return id
}

function truncate(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s
}

export async function showCommand(input: string | undefined, options: ShowOptions): Promise<void> {
    const id = parseId(input)

    startSpinner(`Loading project ${id}…`)
    let project: ProjectDetail
    try {
        project = await apiRequest<ProjectDetail>(`/projects/${id}`)
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Project "${id}" not found.`)
        }
        throw err
    } finally {
        stopSpinner()
    }

    if (isJsonMode()) {
        printJson(project)
        return
    }

    if (isNdjsonMode()) {
        printNdjson(project)
        return
    }

    const typeName = typeof project.type === 'string' ? project.type : project.type?.name
    const description = project.description ? truncate(project.description, 200) : null

    printKeyValue([
        ['ID', project.id],
        ['Name', project.name],
        ['Type', typeName ?? null],
        ['Status', project.status?.name ?? null],
        ['Start at', project.start_at ?? null],
        ['Finish at', project.finish_at ?? null],
        ['Amount', project.amount ?? null],
        ['Responsible', project.responsible?.name ?? null],
        ['Description', description],
    ])
}
