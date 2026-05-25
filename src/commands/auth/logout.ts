import { printSuccess } from '../../lib/output.js'

export async function logoutCommand(): Promise<void> {
    // TODO: remove credentials from keyring
    printSuccess('Logged out.')
}
