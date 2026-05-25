import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CONFIG_DIR = join(homedir(), '.config', 'if-team-cli')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

export interface Config {
    baseUrl: string
}

const DEFAULTS: Config = {
    baseUrl: 'https://api.demo.if.team',
}

export function loadConfig(): Config {
    try {
        const raw = readFileSync(CONFIG_PATH, 'utf8')
        return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Config>) }
    } catch {
        return { ...DEFAULTS }
    }
}

export function saveConfig(patch: Partial<Config>): void {
    mkdirSync(CONFIG_DIR, { recursive: true })
    const current = loadConfig()
    writeFileSync(CONFIG_PATH, JSON.stringify({ ...current, ...patch }, null, 2), { mode: 0o600 })
}
