import { logoutRequest } from '../../lib/api/client.js'
import { clearCredentials, loadCredentials } from '../../lib/auth-store.js'
import { CliError } from '../../lib/errors.js'
import { printSuccess } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

export async function logoutCommand(): Promise<void> {
    const creds = loadCredentials()
    if (!creds) {
        throw new CliError('NO_TOKEN', 'Not logged in.')
    }

    startSpinner('Logging out…')
    try {
        // Invalidate the server-side session (best-effort)
        await logoutRequest()
    } finally {
        stopSpinner()
    }

    // Always clear local credentials, even if the server call failed
    clearCredentials()
    const label = creds.mode === 'jwt' ? creds.email : `company ${creds.companyId}`
    printSuccess(`Logged out (${label}).`)
}
