import type { Command } from 'commander'

export function registerWorkloadCommand(program: Command): void {
    const workload = program
        .command('workload')
        .description('Track time (logged time / time entries)')
        .addHelpText(
            'after',
            `
"workload" is if.team's name for time tracking — every entry records logged
time against a task.

Examples:
  if-team workload log --task 42 --duration 2h30m        # log a finished entry (you)
  if-team workload log --task 42 --duration 90m --date 2026-06-05
  if-team workload start --task 42                        # start a live timer
  if-team workload finish --task 42                       # stop the active timer
  if-team workload comment --task 42 --comment "Pairing"  # annotate the active timer
  if-team workload today                                  # today's tracked time
  if-team workload list 42                                # entries for task 42
  if-team workload show 4567                              # one entry
  if-team workload update 4567 --duration 3h
  if-team workload delete 4567 --yes`,
        )

    workload
        .command('log')
        .description('Log a finished time entry against a task')
        .requiredOption('--task <id>', 'Task ID (required)')
        .option('--duration <dur>', 'Time spent: 2h / 90m / 2h30m / 45s / raw seconds')
        .option('--date <date>', 'Entry date (YYYY-MM-DD); maps to start_at at UTC midnight')
        .option('--start-at <datetime>', 'Explicit start datetime (ISO 8601); overrides --date')
        .option('--comment <string>', 'Comment')
        .option('--participant <id|me>', 'Participant ID (defaults to the logged-in user)')
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { logCommand } = await import('./log.js')
            return logCommand(options)
        })

    workload
        .command('start')
        .description('Start a live timer on a task')
        .requiredOption('--task <id>', 'Task ID (required)')
        .option('--stop', 'Stop any other running timer first (default: false)')
        .option('--no-stop', 'Do not stop other running timers')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { startCommand } = await import('./start.js')
            return startCommand(options)
        })

    workload
        .command('finish')
        .description('Stop the active timer on a task')
        .requiredOption('--task <id>', 'Task ID (required)')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { finishCommand } = await import('./finish.js')
            return finishCommand(options)
        })

    workload
        .command('comment')
        .description("Add a comment to a task's active timer")
        .requiredOption('--task <id>', 'Task ID (required)')
        .option('--comment <string>', 'Comment text (required)')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { commentCommand } = await import('./comment.js')
            return commentCommand(options)
        })

    workload
        .command('today')
        .description("Show today's tracked time")
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { todayCommand } = await import('./today.js')
            return todayCommand(options)
        })

    workload
        .command('list <task_id>')
        .description('List time entries for a task')
        .option('--page <n>', 'Page number (1-based)')
        .option('--limit <n>', 'Page size')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one entry per line as NDJSON')
        .action(async (taskId, options) => {
            const { listCommand } = await import('./list.js')
            return listCommand(taskId, options)
        })

    workload
        .command('view [id]', { isDefault: true })
        .description('Show a single time entry (default subcommand)')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    workload
        .command('show <id>')
        .description('Show a single time entry')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    workload
        .command('update <id>')
        .description('Update a time entry')
        .option('--duration <dur>', 'Time spent: 2h / 90m / 2h30m / 45s / raw seconds')
        .option('--date <date>', 'Entry date (YYYY-MM-DD); maps to start_at at UTC midnight')
        .option('--start-at <datetime>', 'Explicit start datetime (ISO 8601); overrides --date')
        .option('--comment <string>', 'Comment')
        .option('--participant <id>', 'Participant ID')
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { updateCommand } = await import('./update.js')
            return updateCommand(id, options)
        })

    workload
        .command('delete <id>')
        .description('Delete a time entry')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { deleteCommand } = await import('./delete.js')
            return deleteCommand(id, options)
        })
}
