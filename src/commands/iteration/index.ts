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
  if-team iteration 345                             # same as \`show\` (implicit view)`,
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
}
