import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { installCommand } from './install.js'
import { uninstallCommand } from './uninstall.js'
import { updateCommand } from './update.js'

describe('skill commands — unknown agent', () => {
    it('install throws INVALID_OPTIONS for an unknown agent', async () => {
        await expect(installCommand('nonsense', {})).rejects.toMatchObject({
            code: 'INVALID_OPTIONS',
        } satisfies Partial<CliError>)
    })

    it('uninstall throws INVALID_OPTIONS for an unknown agent', async () => {
        await expect(uninstallCommand('nonsense', {})).rejects.toMatchObject({
            code: 'INVALID_OPTIONS',
        } satisfies Partial<CliError>)
    })

    it('update throws INVALID_OPTIONS for an unknown agent', async () => {
        await expect(updateCommand('nonsense', {})).rejects.toMatchObject({
            code: 'INVALID_OPTIONS',
        } satisfies Partial<CliError>)
    })
})
