import { apiRequest } from '../../lib/api/client.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode, isNdjsonMode } from '../../lib/global-args.js'
import { confirmDeletion } from '../../lib/mutate.js'
import { printJson, printNdjson, printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'
import { parseId } from './show.js'

export interface DeleteOptions {
    transactionDeletionMethod?: string
    yes?: boolean
    json?: boolean
    ndjson?: boolean
}

export async function deleteCommand(
    input: string | undefined,
    options: DeleteOptions,
): Promise<void> {
    const id = parseId(input)

    await confirmDeletion(`About to delete project ${id}.`, options)

    const query = options.transactionDeletionMethod
        ? { transaction_deletion_method: options.transactionDeletionMethod }
        : undefined

    startSpinner(`Deleting project ${id}…`)
    let res: unknown
    try {
        res = await apiRequest<unknown>(`/projects/${id}`, {
            method: 'DELETE',
            query,
        })
    } catch (err) {
        if (err instanceof CliError && /not\s*found|404/i.test(err.message)) {
            throw new CliError('NOT_FOUND', `Project "${id}" not found.`)
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
    printSuccess(`Project ${id} deleted.`)
}
