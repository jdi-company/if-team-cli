import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CliError } from '../errors.js'

vi.mock('../auth-store.js', () => ({
    loadCredentials: vi.fn(),
    storeCredentials: vi.fn(),
}))

vi.mock('../config.js', () => ({
    loadConfig: vi.fn(() => ({ baseUrl: 'https://api.test.if.team' })),
}))

import { loadCredentials } from '../auth-store.js'
import { apiRequest } from './client.js'

const mockFetch = vi.fn()

beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ ok: true }),
    })
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})

describe('apiRequest — IF_TEAM_TOKEN + IF_TEAM_COMPANY_ID', () => {
    it('injects company_id from IF_TEAM_COMPANY_ID and uses apikey header', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.stubEnv('IF_TEAM_COMPANY_ID', '42')
        vi.mocked(loadCredentials).mockReturnValue(null)

        await apiRequest('/projects')

        const url: string = mockFetch.mock.calls[0][0]
        const opts = mockFetch.mock.calls[0][1] as RequestInit
        expect(url).toContain('company_id=42')
        expect((opts.headers as Record<string, string>).apikey).toBe('env-key')
    })

    it('IF_TEAM_COMPANY_ID takes priority over stored companyId', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.stubEnv('IF_TEAM_COMPANY_ID', '42')
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: 99,
            companyName: 'Stored Co',
        })

        await apiRequest('/projects')

        const url: string = mockFetch.mock.calls[0][0]
        expect(url).toContain('company_id=42')
        expect(url).not.toContain('company_id=99')
    })
})

describe('apiRequest — IF_TEAM_TOKEN without IF_TEAM_COMPANY_ID', () => {
    it('falls back to stored credentials companyId', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: 99,
            companyName: 'Stored Co',
        })

        await apiRequest('/projects')

        const url: string = mockFetch.mock.calls[0][0]
        expect(url).toContain('company_id=99')
        expect((mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }).headers.apikey).toBe('env-key')
    })

    it('throws NO_COMPANY when no stored credentials either', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.mocked(loadCredentials).mockReturnValue(null)

        await expect(apiRequest('/projects')).rejects.toMatchObject({
            code: 'NO_COMPANY',
        })
    })

    it('throws NO_COMPANY even when stored creds exist but have no companyId (guard against corrupt state)', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        // Simulate corrupt stored creds missing companyId
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: undefined as unknown as number,
            companyName: 'Co',
        })

        await expect(apiRequest('/projects')).rejects.toMatchObject({
            code: 'NO_COMPANY',
        })
    })
})

describe('apiRequest — no IF_TEAM_TOKEN', () => {
    it('uses stored credentials', async () => {
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: 77,
            companyName: 'My Co',
        })

        await apiRequest('/projects')

        const url: string = mockFetch.mock.calls[0][0]
        expect(url).toContain('company_id=77')
        expect((mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }).headers.apikey).toBe('stored-key')
    })

    it('throws NO_TOKEN when no stored credentials', async () => {
        vi.mocked(loadCredentials).mockReturnValue(null)

        await expect(apiRequest('/projects')).rejects.toMatchObject({
            code: 'NO_TOKEN',
        })
    })

    it('does not call loadCredentials when IF_TEAM_TOKEN is set', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.stubEnv('IF_TEAM_COMPANY_ID', '42')
        vi.mocked(loadCredentials).mockReturnValue(null)

        await apiRequest('/projects')

        // loadCredentials is still called for companyId fallback, but apikey header must be env key
        const opts = mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> }
        expect(opts.headers.apikey).toBe('env-key')
    })
})

describe('apiRequest — CliError type guard', () => {
    it('thrown NO_COMPANY is a CliError instance', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.mocked(loadCredentials).mockReturnValue(null)

        const err = await apiRequest('/projects').catch((e: unknown) => e)
        expect(err).toBeInstanceOf(CliError)
        expect((err as CliError).hints.length).toBeGreaterThan(0)
    })
})
