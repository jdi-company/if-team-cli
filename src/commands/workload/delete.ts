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

    await confirmDeletion(`About to delete workload ${id}.`, options)

    startSpinner(`Deleting workload ${id}…`)
    let res: unknown
    try {
        res = await apiRequest<unknown>(`/workload/${id}`, { method: 'DELETE' })
    } catch (err) {
        if (err instanceof CliError && err.code === 'NOT_FOUND') {
            throw new CliError('NOT_FOUND', `Workload "${id}" not found.`)
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
    printSuccess(`Workload ${id} deleted.`)
}
