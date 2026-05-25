#!/usr/bin/env node

import { type Command, program } from 'commander'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CliError } from './lib/errors.js'
import { isJsonMode } from './lib/global-args.js'
import { initializeLogger } from './lib/logger.js'
import { formatError, formatErrorJson } from './lib/output.js'
import { stopSpinner } from './lib/spinner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version: string }

program
    .name('if-team')
    .description('if-team CLI')
    .version(pkg.version)
    .option('--no-spinner', 'Disable loading animations')
    .option('-v, --verbose', 'Increase output verbosity (repeat up to 4x: -v, -vv, -vvv, -vvvv)')
    .option('-q, --quiet', 'Suppress success messages')
    .addHelpText(
        'after',
        `
Note for AI/LLM agents:
  Use --json for unambiguous, parseable output.
  Use --quiet to suppress success messages.`,
    )

// Lazy command registry: [description, loader]
const commands: Record<string, [string, () => Promise<(p: Command) => void>]> = {
    auth: [
        'Manage authentication',
        async () => (await import('./commands/auth/index.js')).registerAuthCommand,
    ],
    project: [
        'Browse projects',
        async () => (await import('./commands/project/index.js')).registerProjectCommand,
    ],
    task: [
        'Browse tasks',
        async () => (await import('./commands/task/index.js')).registerTaskCommand,
    ],
}

// Register placeholders so --help lists all commands
for (const [name, [description]] of Object.entries(commands)) {
    program.command(name).description(description)
}

// Find which command is being invoked and lazy-load it
const commandToken = process.argv.slice(2).find((a) => !a.startsWith('-') && a in commands)

if (commandToken) {
    const idx = program.commands.findIndex((c) => c.name() === commandToken)
    if (idx !== -1) (program.commands as Command[]).splice(idx, 1)

    const loader = commands[commandToken][1]
    const register = await loader()
    register(program)
}

initializeLogger()

program
    .parseAsync()
    .catch((err: Error) => {
        if (err instanceof CliError) {
            console.error(isJsonMode() ? formatErrorJson(err) : formatError(err))
        } else {
            console.error(
                isJsonMode() ? formatErrorJson('INTERNAL_ERROR', err.message) : err.message,
            )
        }
        process.exit(1)
    })
    .finally(() => stopSpinner())
