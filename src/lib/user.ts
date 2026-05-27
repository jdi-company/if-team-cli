import { loadCredentials } from './auth-store.js'
import { CliError } from './errors.js'

export function getCurrentUserId(): number {
    const creds = loadCredentials()
    if (!creds) {
        throw new CliError('AUTH_FAILED', 'Not logged in. Run `if-team auth login`.')
    }
    if (creds.mode === 'api-key') {
        throw new CliError(
            'NO_USER_IDENTITY',
            'Cannot resolve "me" in API-key mode.',
            [
                'Pass --assignee <id> explicitly, or log in with `if-team auth login` (email/password).',
            ],
        )
    }
    if (typeof creds.userId !== 'number') {
        throw new CliError(
            'NO_USER_IDENTITY',
            'Stored credentials are missing the user id (saved before this feature shipped).',
            ['Re-run `if-team auth login` to refresh your credentials.'],
        )
    }
    return creds.userId
}
