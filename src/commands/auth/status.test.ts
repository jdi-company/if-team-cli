import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CliError } from '../../lib/errors.js'

vi.mock('../../lib/auth-store.js', () => ({
    loadCredentials: vi.fn(),
}))

vi.mock('../../lib/global-args.js', () => ({
    isJsonMode: vi.fn(() => false),
}))

vi.mock('../../lib/api/client.js', () => ({
    probeAuth: vi.fn(),
}))

vi.mock('../../lib/spinner.js', () => ({
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
}))

import { loadCredentials } from '../../lib/auth-store.js'
import { probeAuth } from '../../lib/api/client.js'
import { isJsonMode } from '../../lib/global-args.js'
import { statusCommand } from './status.js'

let consoleSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(isJsonMode).mockReturnValue(false)
    vi.mocked(probeAuth).mockResolvedValue(undefined)
})

afterEach(() => {
    vi.unstubAllEnvs()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
})

function capturedOutput(): string {
    return consoleSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')
}

describe('statusCommand — not authenticated', () => {
    it('shows not-authenticated message and skips probe', async () => {
        vi.mocked(loadCredentials).mockReturnValue(null)

        await statusCommand()

        expect(capturedOutput()).toContain('Not authenticated')
        expect(vi.mocked(probeAuth)).not.toHaveBeenCalled()
    })

    it('outputs JSON { authenticated: false } and skips probe', async () => {
        vi.mocked(loadCredentials).mockReturnValue(null)
        vi.mocked(isJsonMode).mockReturnValue(true)

        await statusCommand()

        const json = JSON.parse(consoleSpy.mock.calls[0][0] as string)
        expect(json).toEqual({ authenticated: false })
        expect(vi.mocked(probeAuth)).not.toHaveBeenCalled()
    })
})

describe('statusCommand — stored credentials (valid)', () => {
    it('probes API and shows valid token for api-key mode', async () => {
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: 77,
            companyName: 'My Co',
        })

        await statusCommand()

        expect(vi.mocked(probeAuth)).toHaveBeenCalledOnce()
        const out = capturedOutput()
        expect(out).toContain('My Co')
        expect(out).toContain('77')
        expect(out).toContain('API key')
        expect(out).toContain('valid')
    })

    it('probes API and shows valid token for jwt mode', async () => {
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'jwt',
            accessToken: 'eyJ.eyJleHAiOjk5OTk5OTk5OTl9.sig',
            refreshToken: 'refresh',
            email: 'user@example.com',
            name: 'Jane Doe',
            companyId: 55,
            companyName: 'Jane Corp',
        })

        await statusCommand()

        expect(vi.mocked(probeAuth)).toHaveBeenCalledOnce()
        const out = capturedOutput()
        expect(out).toContain('Jane Doe')
        expect(out).toContain('user@example.com')
        expect(out).toContain('Jane Corp')
        expect(out).toContain('valid')
    })

    it('outputs JSON with valid: true for api-key mode', async () => {
        vi.mocked(isJsonMode).mockReturnValue(true)
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: 77,
            companyName: 'My Co',
        })

        await statusCommand()

        const json = JSON.parse(consoleSpy.mock.calls[0][0] as string)
        expect(json).toMatchObject({ authenticated: true, valid: true, mode: 'api-key', companyId: 77 })
    })
})

describe('statusCommand — stored credentials (invalid)', () => {
    it('propagates CliError when probe fails', async () => {
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'bad-key',
            companyId: 77,
            companyName: 'My Co',
        })
        vi.mocked(probeAuth).mockRejectedValue(
            new CliError('INVALID_TOKEN', 'Invalid API key or company ID.'),
        )

        await expect(statusCommand()).rejects.toMatchObject({ code: 'INVALID_TOKEN' })
    })

    it('propagates network errors from probe', async () => {
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: 77,
            companyName: 'My Co',
        })
        vi.mocked(probeAuth).mockRejectedValue(new Error('fetch failed'))

        await expect(statusCommand()).rejects.toThrow('fetch failed')
    })
})

describe('statusCommand — IF_TEAM_TOKEN env var mode', () => {
    it('shows company ID and valid token when IF_TEAM_TOKEN + IF_TEAM_COMPANY_ID', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.stubEnv('IF_TEAM_COMPANY_ID', '42')
        vi.mocked(loadCredentials).mockReturnValue(null)

        await statusCommand()

        expect(vi.mocked(probeAuth)).toHaveBeenCalledOnce()
        const out = capturedOutput()
        expect(out).toContain('42')
        expect(out).toContain('valid')
    })

    it('uses stored company as fallback and shows valid token', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.mocked(loadCredentials).mockReturnValue({
            mode: 'api-key',
            key: 'stored-key',
            companyId: 99,
            companyName: 'Stored Co',
        })

        await statusCommand()

        expect(vi.mocked(probeAuth)).toHaveBeenCalledOnce()
        const out = capturedOutput()
        expect(out).toContain('Stored Co')
        expect(out).toContain('99')
        expect(out).toContain('valid')
    })

    it('skips probe and warns when no company_id available', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.mocked(loadCredentials).mockReturnValue(null)

        await statusCommand()

        expect(vi.mocked(probeAuth)).not.toHaveBeenCalled()
        expect(capturedOutput()).toContain('IF_TEAM_COMPANY_ID')
    })

    it('propagates CliError when env token probe fails', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'bad-env-key')
        vi.stubEnv('IF_TEAM_COMPANY_ID', '42')
        vi.mocked(loadCredentials).mockReturnValue(null)
        vi.mocked(probeAuth).mockRejectedValue(
            new CliError('INVALID_TOKEN', 'Invalid API key.'),
        )

        await expect(statusCommand()).rejects.toMatchObject({ code: 'INVALID_TOKEN' })
    })

    it('outputs JSON with valid: true for env mode', async () => {
        vi.stubEnv('IF_TEAM_TOKEN', 'env-key')
        vi.stubEnv('IF_TEAM_COMPANY_ID', '42')
        vi.mocked(isJsonMode).mockReturnValue(true)
        vi.mocked(loadCredentials).mockReturnValue(null)

        await statusCommand()

        const json = JSON.parse(consoleSpy.mock.calls[0][0] as string)
        expect(json).toMatchObject({ authenticated: true, valid: true, mode: 'env', companyId: 42 })
    })
})
