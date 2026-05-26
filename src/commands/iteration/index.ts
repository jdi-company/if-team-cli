import type { Command } from 'commander'

export function registerIterationCommand(program: Command): void {
    const iteration = program
        .command('iteration')
        .description('Browse project iterations')
        .addHelpText(
            'after',
            `
Examples:
  if-team iteration list 12                         # iterations for project 12
  if-team iteration list 12 --status 1 --limit 50
  if-team iteration statuses                        # available iteration status IDs
  if-team iteration show 345                        # full details for one iteration
  if-team iteration 345                             # same as \`show\` (implicit view)
  if-team iteration delete 345 --yes                # delete without prompt`,
        )

    iteration
        .command('list <project_id>')
        .description('List iterations for a project')
        .option('--status <id>', 'Filter by status ID')
        .option('--page <n>', 'Page number (1-based)')
        .option('--limit <n>', 'Page size (max 50)')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one iteration per line as NDJSON')
        .action(async (projectId, options) => {
            const { listCommand } = await import('./list.js')
            return listCommand(projectId, options)
        })

    iteration
        .command('statuses')
        .description('List available iteration statuses')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one status per line as NDJSON')
        .action(async (options) => {
            const { statusesCommand } = await import('./statuses.js')
            return statusesCommand(options)
        })

    iteration
        .command('view [id]', { isDefault: true })
        .description('Show a single iteration (default subcommand)')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    iteration
        .command('show <id>')
        .description('Show a single iteration')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    iteration
        .command('create')
        .description('Create an iteration in a project')
        .requiredOption('--project <id>', 'Project ID (required)')
        .option('--name <string>', 'Iteration name')
        .option('--comment <string>', 'Comment')
        .option('--status <id>', 'Status ID')
        .option('--start-at <date>', 'Start date (YYYY-MM-DD)')
        .option('--finish-at <date>', 'Finish date (YYYY-MM-DD)')
        .option('--hours <number>', 'Planned hours')
        .option('--amount <number>', 'Amount')
        .option('--exchange-rate <number>', 'Exchange rate')
        .option('--to-project-amount', 'Set to_project_amount = true')
        .option('--no-to-project-amount', 'Set to_project_amount = false')
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { createCommand } = await import('./create.js')
            return createCommand(options)
        })

    iteration
        .command('update <id>')
        .description('Update an iteration')
        .option('--name <string>', 'Iteration name')
        .option('--comment <string>', 'Comment')
        .option('--status <id>', 'Status ID')
        .option('--start-at <date>', 'Start date (YYYY-MM-DD)')
        .option('--finish-at <date>', 'Finish date (YYYY-MM-DD)')
        .option('--hours <number>', 'Planned hours')
        .option('--amount <number>', 'Amount')
        .option('--exchange-rate <number>', 'Exchange rate')
        .option('--to-project-amount', 'Set to_project_amount = true')
        .option('--no-to-project-amount', 'Set to_project_amount = false')
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { updateCommand } = await import('./update.js')
            return updateCommand(id, options)
        })

    iteration
        .command('delete <id>')
        .description('Delete an iteration')
        .option('--transaction-deletion-method <method>', 'Transaction deletion method (e.g. COMPLETE_REMOVAL)')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { deleteCommand } = await import('./delete.js')
            return deleteCommand(id, options)
        })
}
