#!/usr/bin/env node

/**
 * Refreshes any already-installed skill files in the user's home directory
 * after the CLI itself is installed or upgraded via `npm install -g`.
 *
 * Silent no-op when:
 *   - dist/ is missing (npm install in this repo before first build)
 *   - no skills are installed
 *   - any individual update fails (we don't want to break `npm install`)
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const distEntry = join(root, 'dist/lib/skills/update-installed.js')

if (!existsSync(distEntry)) {
    process.exit(0)
}

try {
    const { updateAllInstalledSkills } = await import(pathToFileURL(distEntry).href)
    const result = await updateAllInstalledSkills(false)
    if (result.updated.length > 0) {
        console.log(`if-team: refreshed skill(s): ${result.updated.join(', ')}`)
    }
} catch {
    // Never fail npm install
}
