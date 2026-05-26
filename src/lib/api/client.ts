import { type StoredCredentials, loadCredentials, storeCredentials } from '../auth-store.js'
import { loadConfig } from '../config.js'
import { CliError } from '../errors.js'
import { log } from '../logger.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
    access_token: string
    refresh_token: string
    user: ApiUser
    companies?: ApiCompany[]
}

export interface ApiUser {
    id: number
    email: string
    name: string
    phone?: string
    avatar?: string
}

export interface ApiCompany {
    id: number
    name: string
    owner_id: number
}

interface ApiErrorBody {
    message?: string | string[]
    error?: string
    status?: number
    errors?: Record<string, { constraints?: string[]; children?: unknown }>
}

// Flatten the if.team 422 `errors` map into one human-friendly line per field.
function flattenValidationErrors(
    errors: NonNullable<ApiErrorBody['errors']> | undefined,
): string[] {
    if (!errors) return []
    const out: string[] = []
    for (const [field, info] of Object.entries(errors)) {
        const cs = info?.constraints
        if (Array.isArray(cs) && cs.length > 0) {
            out.push(`${field}: ${cs.join('; ')}`)
        } else {
            out.push(field)
        }
    }
    return out
}

async function safeJson(res: Response): Promise<ApiErrorBody> {
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) return {}
    return res.json().catch(() => ({})) as Promise<ApiErrorBody>
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function jwtExpiresAt(token: string): number {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
        return (payload.exp as number) * 1000
    } catch {
        return 0
    }
}

function isExpired(token: string): boolean {
    // Treat as expired 30 s early to avoid race conditions
    return jwtExpiresAt(token) < Date.now() + 30_000
}

// ─── Auth header ──────────────────────────────────────────────────────────────

async function buildAuthHeaders(
    creds: StoredCredentials,
    baseUrl: string,
): Promise<Record<string, string>> {
    if (creds.mode === 'api-key') {
        return { apikey: creds.key }
    }

    let { accessToken, refreshToken } = creds

    if (isExpired(accessToken)) {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${refreshToken}` },
        })

        if (!res.ok) {
            throw new CliError(
                'AUTH_ERROR',
                'Your session has expired. Run `if-team auth login` to re-authenticate.',
            )
        }

        const data = (await res.json()) as { access_token: string; refresh_token?: string }
        accessToken = data.access_token
        if (data.refresh_token) refreshToken = data.refresh_token

        storeCredentials({ ...creds, accessToken, refreshToken })
    }

    return { Authorization: `Bearer ${accessToken}` }
}

// ─── Core request ─────────────────────────────────────────────────────────────

export async function apiRequest<T>(
    path: string,
    options: RequestInit & { query?: Record<string, string | number> } = {},
): Promise<T> {
    // IF_TEAM_TOKEN env var takes precedence over stored credentials (session-only)
    const envKey = process.env.IF_TEAM_TOKEN
    const { baseUrl } = loadConfig()

    let creds: StoredCredentials | null
    if (envKey) {
        const storedCreds = loadCredentials()
        const envCompanyId = process.env.IF_TEAM_COMPANY_ID
            ? parseInt(process.env.IF_TEAM_COMPANY_ID, 10)
            : undefined
        const companyId = envCompanyId ?? storedCreds?.companyId

        if (companyId === undefined) {
            throw new CliError(
                'NO_COMPANY',
                'No company_id available. Set IF_TEAM_COMPANY_ID or run `if-team auth login` first.',
                ['Example: IF_TEAM_COMPANY_ID=123 IF_TEAM_TOKEN=<key> if-team task list'],
            )
        }

        creds = {
            mode: 'api-key',
            key: envKey,
            companyId,
            companyName: storedCreds?.companyName ?? '',
        }
    } else {
        creds = loadCredentials()
    }

    if (!creds) {
        throw new CliError('NO_TOKEN', 'Not authenticated. Run `if-team auth login`.')
    }

    const authHeaders = await buildAuthHeaders(creds, baseUrl)

    const url = new URL(`${baseUrl}${path}`)
    if (options.query) {
        for (const [k, v] of Object.entries(options.query)) {
            url.searchParams.set(k, String(v))
        }
    }
    // Most if.team endpoints require company_id. Inject from stored credentials
    // unless the caller already provided it explicitly.
    if (!url.searchParams.has('company_id') && creds && 'companyId' in creds) {
        url.searchParams.set('company_id', String(creds.companyId))
    }

    const { query: _q, ...fetchOptions } = options
    log(2, `→ ${fetchOptions.method ?? 'GET'} ${url.toString()}`)
    if (fetchOptions.body !== undefined && fetchOptions.body !== null) {
        log(3, '  body:', typeof fetchOptions.body === 'string' ? fetchOptions.body : '<binary>')
    }
    const res = await fetch(url.toString(), {
        ...fetchOptions,
        headers: {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string>),
            ...authHeaders,
        },
    })
    log(2, `← ${res.status} ${res.statusText}`)

    if (!res.ok) {
        const body = await safeJson(res)
        const message = Array.isArray(body.message)
            ? body.message.join(', ')
            : (body.message ?? `${res.status} ${res.statusText}`)
        const hints = flattenValidationErrors(body.errors)
        // Surface HTTP 404 with a distinct code so callers can re-throw a
        // friendly entity-scoped message without parsing the server text.
        if (res.status === 404) {
            throw new CliError('NOT_FOUND', message, hints)
        }
        throw new CliError('API_ERROR', message, hints)
    }

    return res.json() as Promise<T>
}

// ─── Fetch company list with a temporary JWT ─────────────────────────────────
// /companies requires Bearer auth — API keys are rejected.

export async function getCompanies(accessToken: string): Promise<ApiCompany[]> {
    const { baseUrl } = loadConfig()
    const res = await fetch(`${baseUrl}/companies`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
        const body = await safeJson(res)
        const message = Array.isArray(body.message)
            ? body.message.join(', ')
            : (body.message ?? `${res.status} ${res.statusText}`)
        throw new CliError('API_ERROR', `Could not fetch companies: ${message}`)
    }
    const data = await res.json() as ApiCompany[] | { data: ApiCompany[] }
    // /companies may return a plain array or a paginated { data: [] } envelope
    return Array.isArray(data) ? data : data.data
}

// ─── Unauthenticated login request ────────────────────────────────────────────

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
    const { baseUrl } = loadConfig()
    const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email, password }),
    })

    if (!res.ok) {
        const body = await safeJson(res)
        const message = body.message ?? 'Login failed. Check your email and password.'
        throw new CliError('AUTH_FAILED', Array.isArray(message) ? message.join(', ') : message)
    }

    return res.json() as Promise<LoginResponse>
}

// ─── Validate API key ─────────────────────────────────────────────────────────
// /auth/profile does not accept API keys — use /subscriptions/current as a
// lightweight connectivity probe that works with apikey + company_id.

export async function validateApiKey(key: string, companyId: number): Promise<void> {
    const { baseUrl } = loadConfig()
    const res = await fetch(`${baseUrl}/subscriptions/current?company_id=${companyId}`, {
        headers: { apikey: key },
    })

    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            throw new CliError(
                'INVALID_TOKEN',
                'Invalid API key or company ID. Verify both in your if.team admin dashboard.',
            )
        }
        throw new CliError('API_ERROR', `Validation failed: ${res.status} ${res.statusText}`)
    }
}

// ─── Lightweight auth probe ───────────────────────────────────────────────────
// Validates the current session (env var or stored creds) against the live API.
// Throws CliError on auth failure or network error.

export async function probeAuth(): Promise<void> {
    await apiRequest('/subscriptions/current')
}

// ─── Server-side logout ───────────────────────────────────────────────────────

export async function logoutRequest(): Promise<void> {
    // Best-effort — don't throw if the request fails; local credentials are
    // cleared regardless in the logout command.
    try {
        await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
        // ignore
    }
}
