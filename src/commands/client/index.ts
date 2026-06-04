import type { Command } from 'commander'
import { collectStrings } from '../../lib/mutate.js'

export function registerClientCommand(program: Command): void {
    const client = program
        .command('client')
        .description('Manage clients (companies and individuals)')
        .addHelpText(
            'after',
            `
Examples:
  if-team client list --type legal                 # business clients (--type is required)
  if-team client list --type individual --name adam
  if-team client roles                             # available client role IDs
  if-team client show 1001                         # full details for one client
  if-team client 1001                              # same as \`show\` (implicit view)
  if-team client create --name "Acme Inc" --type legal --email billing@acme.test
  if-team client update 1001 --phone "+123"
  if-team client delete 1001 --yes                 # delete without prompt`,
        )

    client
        .command('list')
        .description('List clients (the API requires --type)')
        .requiredOption('--type <individual|legal>', 'Client type to list (required by the API)')
        .option('--name <string>', 'Filter by name')
        .option('--email <string>', 'Filter by email')
        .option('--phone <string>', 'Filter by phone')
        .option('--comment <string>', 'Filter by comment')
        .option('--country <id>', 'Filter by country ID')
        .option('--page <n>', 'Page number (1-based)')
        .option('--limit <n>', 'Page size')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one client per line as NDJSON')
        .action(async (options) => {
            const { listCommand } = await import('./list.js')
            return listCommand(options)
        })

    client
        .command('roles')
        .description('List available client roles')
        .option('--json', 'Output the raw API response as JSON')
        .option('--ndjson', 'Stream one role per line as NDJSON')
        .action(async (options) => {
            const { rolesCommand } = await import('./roles.js')
            return rolesCommand(options)
        })

    client
        .command('view [id]', { isDefault: true })
        .description('Show a single client (default subcommand)')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    client
        .command('show <id>')
        .description('Show a single client')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { showCommand } = await import('./show.js')
            return showCommand(id, options)
        })

    client
        .command('create')
        .description('Create a client')
        .option('--name <string>', 'Client name (required by the API)')
        .option('--type <individual|legal>', 'Client type')
        .option('--email <string>', 'Email')
        .option('--phone <string>', 'Phone')
        .option('--comment <string>', 'Comment')
        .option('--address <string>', 'Address')
        .option('--country <id>', 'Country ID')
        .option('--iban <string>', 'IBAN')
        .option('--bank <string>', 'Bank')
        .option('--registration-number <string>', 'Registration number')
        .option('--telegram <string>', 'Telegram')
        .option('--whatsapp <string>', 'WhatsApp')
        .option('--date-of-birth <date>', 'Date of birth')
        .option('--responsible <id>', 'Responsible participant ID (repeatable)', collectStrings)
        .option('--role <id>', 'Client role ID (repeatable)', collectStrings)
        .option('--lead <id>', 'Source lead ID')
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (options) => {
            const { createCommand } = await import('./create.js')
            return createCommand(options)
        })

    client
        .command('update <id>')
        .description('Update a client')
        .option('--name <string>', 'Client name')
        .option('--type <individual|legal>', 'Client type')
        .option('--email <string>', 'Email')
        .option('--phone <string>', 'Phone')
        .option('--comment <string>', 'Comment')
        .option('--address <string>', 'Address')
        .option('--country <id>', 'Country ID')
        .option('--iban <string>', 'IBAN')
        .option('--bank <string>', 'Bank')
        .option('--registration-number <string>', 'Registration number')
        .option('--telegram <string>', 'Telegram')
        .option('--whatsapp <string>', 'WhatsApp')
        .option('--date-of-birth <date>', 'Date of birth')
        .option('--responsible <id>', 'Responsible participant ID (repeatable)', collectStrings)
        .option('--role <id>', 'Client role ID (repeatable)', collectStrings)
        .option('--lead <id>', 'Source lead ID')
        .option('--data <json>', 'JSON body (string, @file, or - for stdin); flags override its fields')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { updateCommand } = await import('./update.js')
            return updateCommand(id, options)
        })

    client
        .command('delete <id>')
        .description('Delete a client')
        .option('--yes', 'Skip the confirmation prompt')
        .option('--json', 'Output the raw API response as pretty JSON')
        .option('--ndjson', 'Output the raw API response as a single compact JSON line')
        .action(async (id, options) => {
            const { deleteCommand } = await import('./delete.js')
            return deleteCommand(id, options)
        })
}
