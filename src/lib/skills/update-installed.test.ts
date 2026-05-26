import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { skillInstallers } from './index.js'
import { updateAllInstalledSkills } from './update-installed.js'

describe('updateAllInstalledSkills', () => {
    let tmp: string

    beforeEach(async () => {
        tmp = await mkdtemp(join(tmpdir(), 'if-team-update-'))
        vi.spyOn(process, 'cwd').mockReturnValue(tmp)
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        await rm(tmp, { recursive: true, force: true })
    })

    it('skips agents that are not installed', async () => {
        const result = await updateAllInstalledSkills(true)
        expect(result.updated).toEqual([])
        expect(result.errors).toEqual([])
        expect(result.skipped).toEqual(Object.keys(skillInstallers))
    })

    it('updates only the agents that have a SKILL.md on disk', async () => {
        await skillInstallers['universal'].install(true, false)
        await skillInstallers['cursor'].install(true, false)

        const result = await updateAllInstalledSkills(true)

        expect(result.updated.sort()).toEqual(['cursor', 'universal'])
        expect(result.skipped).not.toContain('universal')
        expect(result.skipped).not.toContain('cursor')
        expect(result.errors).toEqual([])
    })
})
