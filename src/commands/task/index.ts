import type { Command } from 'commander'

export function registerTaskCommand(program: Command): void {
    const task = program
        .command('task')
        .description('Browse tasks')
        .addHelpText(
            'after',
            `
Examples:
  if-team task list                                 # first page of tasks
  if-team task list --project 12 --status 3
  if-team task list --finish-at 2026-05-26          # tasks due on a specific date
  if-team task list --start-at 2026-05-26 --finish-at 2026-05-31
  if-team task statuses                             # available status IDs
  if-team task priorities                           # available priority IDs
  if-team task show 4567                            # full details for one task
  if-team task 4567                                 # same as \`show\` (implicit view)`,
        )

    task.command('list')
        .description('List tasks')
        .option('--status <id>', 'Filter by status ID')
        .option('--project <id>', 'Filter by project ID')
        .option('--start-at <date>', 'Filter by start date (YYYY-MM-DD)')
        .option('--finish-at <date>', 'Filter by finish date (YYYY-MM-DD)')
        .option('--page <n>', 'Page number (1-based)')
        .option('--limit <n>', 'Page size')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one task per line as NDJSON')
        .action(async (options) => {
            const { listCommand } = await import('./list.js')
            return listCommand(options)
        })

    task.command('statuses')
        .description('List available task statuses')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one status per line as NDJSON')
        .action(async (options) => {
            const { statusesCommand } = await import('./statuses.js')
            return statusesCommand(options)
        })

    task.command('priorities')
        .description('List available task priorities')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one priority per line as NDJSON')
        .action(async (options) => {
            const { prioritiesCommand } = await import('./priorities.js')
            return prioritiesCommand(options)
        })

    task.command('view [id]', { isDefault: true })
        .description('Show a single task (default subcommand)')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    task.command('show <id>')
        .description('Show a single task')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })
}
