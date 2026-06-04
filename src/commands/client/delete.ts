import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { confirmDeletion } from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseId } from './show.js'

export interface DeleteOptions {
    yes?: boolean
    json?: boolean
    ndjson?: boolean
}

export async function deleteCommand(
    input: string | undefined,
    options: DeleteOptions,
): Promise<void> {
    const id = parseId(input)

    await confirmDeletion(`About to delete client ${id}.`, options)

    startSpinner(`Deleting client ${id}…`)
    let res: unknown
    try {
        res = await apiRequest<unknown>(`/clients/${id}`, { method: 'DELETE' })
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
    printSuccess(`Client ${id} deleted.`)
}
