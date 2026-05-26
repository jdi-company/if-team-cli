import { access, mkdir, readdir, readFile, rmdir, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CliError } from '../errors.js'
import {
    SKILL_AUTHOR,
    SKILL_COMPATIBILITY,
    SKILL_CONTENT,
    SKILL_DESCRIPTION,
    SKILL_NAME,
} from './content.js'
import type { SkillInstaller } from './types.js'

interface InstallerConfig {
    name: string
    description: string
    dirName: string
}

interface PackageJson {
    version: string
    license: string
}

let cachedPkg: PackageJson | undefined

async function readPackageJson(): Promise<PackageJson> {
    if (cachedPkg) return cachedPkg
    // src/lib/skills/  →  ../../../package.json  (works for both src and dist)
    const here = dirname(fileURLToPath(import.meta.url))
    const path = join(here, '../../../package.json')
    const raw = await readFile(path, 'utf-8')
    cachedPkg = JSON.parse(raw) as PackageJson
    return cachedPkg
}

export async function generateSkillFile(): Promise<string> {
    const pkg = await readPackageJson()
    const frontmatter = `---
name: ${SKILL_NAME}
description: ${JSON.stringify(SKILL_DESCRIPTION)}
compatibility: ${JSON.stringify(SKILL_COMPATIBILITY)}
license: ${pkg.license}
metadata:
  author: ${SKILL_AUTHOR}
  version: ${JSON.stringify(pkg.version)}
---

`
    return frontmatter + SKILL_CONTENT
}

export function createInstaller(config: InstallerConfig): SkillInstaller {
    function getInstallPath(local: boolean): string {
        const base = local ? process.cwd() : homedir()
        return join(base, config.dirName, 'skills', SKILL_NAME, 'SKILL.md')
    }

    const installer: SkillInstaller = {
        name: config.name,
        description: config.description,

        getInstallPath,

        generateContent(): string {
            throw new Error('Use generateContentAsync via install/update')
        },

        async isInstalled(local: boolean): Promise<boolean> {
            try {
                await access(getInstallPath(local))
                return true
            } catch {
                return false
            }
        },

        async install(local: boolean, force: boolean): Promise<void> {
            // For non-local installs of agent-specific skills, require the agent
            // directory to already exist (so we don't silently scaffold for an
            // agent the user doesn't use). `.agents` is the universal target —
            // always allowed.
            if (!local && config.dirName !== '.agents') {
                const agentDir = join(homedir(), config.dirName)
                try {
                    await access(agentDir)
                } catch {
                    throw new CliError(
                        'NOT_FOUND',
                        `${config.name} does not appear to be installed (${agentDir} not found)`,
                        [
                            `Install ${config.name} first, or use --local to install into the current project.`,
                        ],
                    )
                }
            }

            const filepath = getInstallPath(local)
            const exists = await installer.isInstalled(local)
            if (exists && !force) {
                throw new CliError(
                    'ALREADY_EXISTS',
                    `Skill file already exists at ${filepath}`,
                    ['Pass --force to overwrite.'],
                )
            }
            const content = await generateSkillFile()
            await mkdir(dirname(filepath), { recursive: true })
            await writeFile(filepath, content, 'utf-8')
        },

        async update(local: boolean): Promise<void> {
            const filepath = getInstallPath(local)
            const content = await generateSkillFile()
            await writeFile(filepath, content, 'utf-8')
        },

        async uninstall(local: boolean): Promise<void> {
            const filepath = getInstallPath(local)
            const exists = await installer.isInstalled(local)
            if (!exists) {
                throw new CliError('NOT_FOUND', `Skill file not found at ${filepath}`)
            }
            await unlink(filepath)
            const dir = dirname(filepath)
            try {
                const files = await readdir(dir)
                if (files.length === 0) await rmdir(dir)
            } catch {
                // Ignore cleanup errors
            }
        },
    }

    return installer
}
