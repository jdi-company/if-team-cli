import { unlinkSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SERVICE = 'if-team-cli'
const ACCOUNT = 'credentials'
const FALLBACK_PATH = join(homedir(), '.config', 'if-team-cli', 'credentials.json')

export type StoredCredentials =
    | {
          mode: 'api-key'
          key: string
          email: string
          name: string
          companyId: number
          companyName: string
      }
    | {
          mode: 'jwt'
          accessToken: string
          refreshToken: string
          email: string
          name: string
          companyId: number
          companyName: string
      }

// Lazy-load keyring so startup doesn't fail on systems without a credential manager
function getEntry(): import('@napi-rs/keyring').Entry | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Entry } = require('@napi-rs/keyring') as typeof import('@napi-rs/keyring')
        return new Entry(SERVICE, ACCOUNT)
    } catch {
        return null
    }
}

export type StoreResult = { secure: true } | { secure: false; fallbackPath: string }

export function storeCredentials(creds: StoredCredentials): StoreResult {
    const payload = JSON.stringify(creds)
    const entry = getEntry()
    if (entry) {
        try {
            entry.setPassword(payload)
            return { secure: true }
        } catch {
            // keyring available but write failed — fall through
        }
    }
    // Fallback: write to file with restrictive permissions (owner read/write only)
    mkdirSync(join(homedir(), '.config', 'if-team-cli'), { recursive: true })
    writeFileSync(FALLBACK_PATH, payload, { mode: 0o600 })
    return { secure: false, fallbackPath: FALLBACK_PATH }
}

export function loadCredentials(): StoredCredentials | null {
    const entry = getEntry()
    if (entry) {
        try {
            const raw = entry.getPassword()
            if (raw) return JSON.parse(raw) as StoredCredentials
        } catch {
            // fall through to file
        }
    }
    try {
        return JSON.parse(readFileSync(FALLBACK_PATH, 'utf8')) as StoredCredentials
    } catch {
        return null
    }
}

export function clearCredentials(): void {
    const entry = getEntry()
    if (entry) {
        try {
            entry.deletePassword()
        } catch {
            // already gone
        }
    }
    try {
        unlinkSync(FALLBACK_PATH)
    } catch {
        // already gone
    }
}
