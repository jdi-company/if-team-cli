import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import {
    asNumber,
    mergeBody,
    parseDataInput,
} from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

export interface CreateOptions {
    project?: string
    name?: string
    description?: string
    status?: string
    priority?: string
    iteration?: string
    startAt?: string
    finishAt?: string
    timePlan?: string
    parent?: string
    participant?: number[]
    client?: string[]
    data?: string
    json?: boolean
    ndjson?: boolean
}

export function parseProjectId(input: string | undefined): number {
    if (input === undefined || input === '') {
        throw new CliError('MISSING_ID', '--project <id> is required to create a task.', [
            'Example: if-team task create --project 12 --name "My task"',
        ])
    }
    const id = Number(input)
    if (!Number.isInteger(id) || id <= 0) {
        throw new CliError('INVALID_REF', `--project "${input}" is not a valid ID.`)
    }
    return id
}

export function buildCreateBody(options: CreateOptions): Record<string, unknown> {
    const data = parseDataInput(options.data)
    const flags = {
        name: options.name,
        description: options.description,
        status_id: asNumber(options.status, '--status'),
        priority_id: asNumber(options.priority, '--priority'),
        iteration_id: asNumber(options.iteration, '--iteration'),
        start_at: options.startAt,
        finish_at: options.finishAt,
        time_plan: asNumber(options.timePlan, '--time-plan'),
        parent_id: asNumber(options.parent, '--parent'),
        participant_ids: options.participant,
        client_ids: options.client,
    }
    return mergeBody(data, flags)
}

interface CreatedResponse {
    id?: number
    [key: string]: unknown
}

export async function createCommand(options: CreateOptions): Promise<void> {
    const projectId = parseProjectId(options.project)
    const body = buildCreateBody(options)

    startSpinner('Creating task…')
    let res: CreatedResponse
    try {
        res = await apiRequest<CreatedResponse>('/tasks', {
            method: 'POST',
            query: { project_id: projectId },
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
    printSuccess(res.id ? `Task created (ID: ${res.id}).` : 'Task created.')
}
