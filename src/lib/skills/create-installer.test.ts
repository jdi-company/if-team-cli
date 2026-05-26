import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CliError } from '../errors.js'
import { generateSkillFile } from './create-installer.js'
import { skillInstallers } from './index.js'

describe('generateSkillFile', () => {
    it('produces frontmatter with name, license, and version pulled from package.json', async () => {
        const content = await generateSkillFile()

        expect(content.startsWith('---\n')).toBe(true)
        expect(content).toContain('name: if-team-cli')
        expect(content).toContain('description: "Manage if.team projects')
        expect(content).toContain('compatibility: "Requires the if-team CLI')
        expect(content).toContain('license: MIT')
        expect(content).toContain('author: JAST DEVELOP InT OÜ')
        // Version is JSON-stringified (quoted)
        expect(content).toMatch(/version: "\d+\.\d+\.\d+/)
        // Body follows the frontmatter
        expect(content).toContain('# if.team CLI (if-team)')
    })
})

describe('createInstaller — local install round-trip', () => {
    let tmp: string
    const installer = skillInstallers['universal'] // .agents — no home-dir gate

    beforeEach(async () => {
        tmp = await mkdtemp(join(tmpdir(), 'if-team-skill-'))
        vi.spyOn(process, 'cwd').mockReturnValue(tmp)
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        await rm(tmp, { recursive: true, force: true })
    })

    it('install writes SKILL.md and isInstalled flips to true', async () => {
        expect(await installer.isInstalled(true)).toBe(false)

        await installer.install(true, false)

        const path = installer.getInstallPath(true)
        expect(path).toBe(join(tmp, '.agents', 'skills', 'if-team-cli', 'SKILL.md'))
        expect(await installer.isInstalled(true)).toBe(true)

        const written = await readFile(path, 'utf-8')
        expect(written).toContain('name: if-team-cli')
        expect(written).toContain('# if.team CLI (if-team)')
    })

    it('install without --force fails when file already exists', async () => {
        await installer.install(true, false)
        await expect(installer.install(true, false)).rejects.toMatchObject({
            code: 'ALREADY_EXISTS',
        } satisfies Partial<CliError>)
    })

    it('install with --force overwrites existing file', async () => {
        await installer.install(true, false)
        // Should not throw
        await installer.install(true, true)
        expect(await installer.isInstalled(true)).toBe(true)
    })

    it('update rewrites content even when called repeatedly', async () => {
        await installer.install(true, false)
        await installer.update(true)
        const written = await readFile(installer.getInstallPath(true), 'utf-8')
        expect(written).toContain('name: if-team-cli')
    })

    it('uninstall removes the file and leaves isInstalled false', async () => {
        await installer.install(true, false)
        await installer.uninstall(true)
        expect(await installer.isInstalled(true)).toBe(false)
    })

    it('uninstall throws NOT_FOUND when no file is installed', async () => {
        await expect(installer.uninstall(true)).rejects.toMatchObject({
            code: 'NOT_FOUND',
        } satisfies Partial<CliError>)
    })
})

describe('createInstaller — install path is per-agent dirName', () => {
    it('claude-code installs under .claude/skills/if-team-cli/SKILL.md', () => {
        const path = skillInstallers['claude-code'].getInstallPath(true)
        expect(path.endsWith('/.claude/skills/if-team-cli/SKILL.md')).toBe(true)
    })

    it('cursor installs under .cursor/skills/if-team-cli/SKILL.md', () => {
        const path = skillInstallers['cursor'].getInstallPath(true)
        expect(path.endsWith('/.cursor/skills/if-team-cli/SKILL.md')).toBe(true)
    })

    it('universal installs under .agents/skills/if-team-cli/SKILL.md', () => {
        const path = skillInstallers['universal'].getInstallPath(true)
        expect(path.endsWith('/.agents/skills/if-team-cli/SKILL.md')).toBe(true)
    })
})
