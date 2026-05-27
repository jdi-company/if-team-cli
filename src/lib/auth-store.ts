import { Entry } from '@napi-rs/keyring'
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
          companyId: number
          companyName: string
          // email/name not available — API key cannot call /auth/profile
      }
    | {
          mode: 'jwt'
          accessToken: string
          refreshToken: string
          userId?: number
          email: string
          name: string
          companyId: number
          companyName: string
      }

function getEntry(): Entry | null {
    try {
        return new Entry(SERVICE, ACCOUNT)
    } catch {
        // Keychain service unavailable (headless Linux without libsecret, etc.)
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
            // Clean up any stale fallback file left from a previous failed attempt
            try { unlinkSync(FALLBACK_PATH) } catch { /* already gone */ }
            return { secure: true }
        } catch {
            // Keychain available but write failed — fall through
        }
    }
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
        try { entry.deletePassword() } catch { /* already gone */ }
    }
    try { unlinkSync(FALLBACK_PATH) } catch { /* already gone */ }
}
