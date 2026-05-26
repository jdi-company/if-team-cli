#!/usr/bin/env node

/**
 * Regenerates skills/if-team-cli/SKILL.md from src/lib/skills/content.ts.
 * Source of truth is the TS module; this file is generated output.
 *
 * Requires `npm run build` to have been run first.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

try {
    const modulePath = pathToFileURL(join(root, 'dist/lib/skills/create-installer.js')).href
    const { generateSkillFile } = await import(modulePath)
    const content = await generateSkillFile()
    const target = join(root, 'skills/if-team-cli/SKILL.md')
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, 'utf-8')
    console.log(`wrote ${target.slice(root.length + 1)}`)
} catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
        console.error('ERROR: dist/ not found. Run `npm run build` first.')
    } else {
        console.error(err)
    }
    process.exit(1)
}
