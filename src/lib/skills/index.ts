import { createInstaller } from './create-installer.js'
import type { SkillInstaller } from './types.js'

export const skillInstallers: Record<string, SkillInstaller> = {
    'claude-code': createInstaller({
        name: 'claude-code',
        description: 'Claude Code skill for if-team CLI',
        dirName: '.claude',
    }),
    codex: createInstaller({
        name: 'codex',
        description: 'Codex CLI skill for if-team CLI',
        dirName: '.codex',
    }),
    copilot: createInstaller({
        name: 'copilot',
        description: 'GitHub Copilot skill for if-team CLI',
        dirName: '.copilot',
    }),
    cursor: createInstaller({
        name: 'cursor',
        description: 'Cursor skill for if-team CLI',
        dirName: '.cursor',
    }),
    gemini: createInstaller({
        name: 'gemini',
        description: 'Gemini CLI skill for if-team CLI',
        dirName: '.gemini',
    }),
    universal: createInstaller({
        name: 'universal',
        description: 'Universal agent skill (.agents) for if-team CLI',
        dirName: '.agents',
    }),
}

export function getInstaller(agent: string): SkillInstaller | undefined {
    return skillInstallers[agent]
}

export function listAgents(): string[] {
    return Object.keys(skillInstallers)
}

export { generateSkillFile } from './create-installer.js'
export type { SkillInstaller } from './types.js'
