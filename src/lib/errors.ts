export type ErrorType = 'error' | 'warning' | 'info'

export type ErrorCode =
    // Auth
    | 'AUTH_ERROR'
    | 'AUTH_FAILED'
    | 'INVALID_TOKEN'
    | 'NO_COMPANY'
    | 'NO_TOKEN'
    // API & network
    | 'API_ERROR'
    | 'INTERNAL_ERROR'
    | 'RATE_LIMITED'
    // Validation
    | 'CONFLICTING_OPTIONS'
    | 'INVALID_OPTIONS'
    | 'INVALID_REF'
    // Missing input
    | 'MISSING_CONTENT'
    | 'MISSING_ID'
    | 'MISSING_NAME'
    // Not found
    | 'NOT_FOUND'
    // State errors
    | 'ALREADY_EXISTS'
    | 'NO_CHANGES'
    | 'FETCH_FAILED'
    // Escape hatch
    | (string & {})

export class CliError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly hints: string[] = [],
        public readonly type: ErrorType = 'error',
    ) {
        super(message)
        this.name = 'CliError'
    }
}
