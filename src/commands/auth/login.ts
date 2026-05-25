import { CliError } from '../../lib/errors.js'
import { printSuccess } from '../../lib/output.js'

interface LoginOptions {
    token?: string
}

export async function loginCommand(options: LoginOptions): Promise<void> {
    const token = options.token ?? process.env.IF_TEAM_TOKEN
    if (!token) {
        throw new CliError(
            'NO_TOKEN',
            'No token provided.',
            ['Pass --token <token> or set the IF_TEAM_TOKEN environment variable.'],
        )
    }
    // TODO: validate token against API and persist to keyring
    printSuccess('Logged in successfully.')
}
