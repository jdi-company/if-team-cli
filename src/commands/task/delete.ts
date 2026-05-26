import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { confirmDeletion } from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseId } from './show.js'

export interface DeleteOptions {
    stop?: boolean
    yes?: boolean
    json?: boolean
    ndjson?: boolean
}

export async function deleteCommand(
    input: string | undefined,
    options: DeleteOptions,
): Promise<void> {
    const id = parseId(input)
    const stop = options.stop !== false

    await confirmDeletion(`About to delete task ${id}.`, options)

    startSpinner(`Deleting task ${id}…`)
    let res: unknown
    try {
        res = await apiRequest<unknown>(`/tasks/${id}`, {
            method: 'DELETE',
            query: { stop: stop ? 'true' : 'false' },
        })
    } catch (err) {
        if (err instanceof CliError && /not\s*found|404/i.test(err.message)) {
            throw new CliError('NOT_FOUND', `Task "${id}" not found.`)
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
    printSuccess(`Task ${id} deleted.`)
}
