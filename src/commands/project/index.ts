import type { Command } from 'commander'
import { collectStrings } from '../../lib/mutate.js'

export function registerProjectCommand(program: Command): void {
    const project = program
        .command('project')
        .description('Browse projects')
        .addHelpText(
            'after',
            `
Examples:
  if-team project list                              # first page of projects
  if-team project list --status 3 --limit 50
  if-team project statuses                          # available status IDs
  if-team project show 1234                         # full details for one project
  if-team project 1234                              # same as \`show\` (implicit view)
  if-team project delete 1234 --yes                 # delete without prompt`,
        )

    project
        .command('list')
        .description('List projects')
        .option('--status <id>', 'Filter by status ID')
        .option('--page <n>', 'Page number (1-based)')
        .option('--limit <n>', 'Page size (max 50)')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one project per line as NDJSON')
        .action(async (options) => {
            const { listCommand } = await import('./list.js')
            return listCommand(options)
        })

    project
        .command('statuses')
        .description('List available project statuses')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one status per line as NDJSON')
        .action(async (options) => {
            const { statusesCommand } = await import('./statuses.js')
            return statusesCommand(options)
        })

    project
        .command('view [id]', { isDefault: true })
        .description('Show a single project (default subcommand)')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    project
        .command('show <id>')
        .description('Show a single project')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    project
        .command('create')
        .description('Create a project')
        .option('--name <string>', 'Project name')
        .option('--description <string>', 'Description')
        .option('--status <id>', 'Status ID')
        .option('--responsible <id>', 'Responsible participant ID')
        .option('--type <string>', 'Project type')
        .option('--start-at <date>', 'Start date (YYYY-MM-DD)')
        .option('--finish-at <date>', 'Finish date (YYYY-MM-DD)')
        .option('--amount <number>', 'Amount')
        .option('--currency <id>', 'Currency ID')
        .option('--client <id>', 'Client ID (repeatable)', collectStrings)
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { createCommand } = await import('./create.js')
            return createCommand(options)
        })

    project
        .command('update <id>')
        .description('Update a project')
        .option('--name <string>', 'Project name')
        .option('--description <string>', 'Description')
        .option('--status <id>', 'Status ID')
        .option('--responsible <id>', 'Responsible participant ID')
        .option('--type <string>', 'Project type')
        .option('--start-at <date>', 'Start date (YYYY-MM-DD)')
        .option('--finish-at <date>', 'Finish date (YYYY-MM-DD)')
        .option('--amount <number>', 'Amount')
        .option('--client <id>', 'Client ID (repeatable)', collectStrings)
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { updateCommand } = await import('./update.js')
            return updateCommand(id, options)
        })

    project
        .command('delete <id>')
        .description('Delete a project')
        .option('--transaction-deletion-method <method>', 'Transaction deletion method (e.g. COMPLETE_REMOVAL)')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { deleteCommand } = await import('./delete.js')
            return deleteCommand(id, options)
        })
}
