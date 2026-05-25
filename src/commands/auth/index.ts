import type { Command } from 'commander'

export function registerAuthCommand(program: Command): void {
    const auth = program
        .command('auth')
        .description('Manage authentication')
        .addHelpText(
            'after',
            `
Examples:
  if-team auth login                        # interactive email + password prompt
  if-team auth login --key                  # API key — prompted silently (recommended)
  if-team auth login --key <api-key>        # API key inline (⚠ appears in shell history)
  IF_TEAM_TOKEN=<key> if-team auth status   # session-only env var (not stored)
  if-team auth status
  if-team auth logout`,
        )

    auth.command('login')
        .description('Authenticate with if.team')
        .option(
            '--key [token]',
            'API key from the if.team admin dashboard; omit the value to be prompted silently',
        )
        .addHelpText(
            'after',
            `
Note: --password is intentionally not supported. Passwords passed as flags
appear in shell history and process listings. Always prompted interactively
with silent input (no echo, no dots) — enterprise standard (sudo, ssh, gh).

Similarly, passing the API key as a value (--key <token>) will appear in shell
history. Prefer --key without a value: you will be prompted silently instead.

The IF_TEAM_TOKEN environment variable is also accepted as an API key but is
session-only — it is never written to disk.`,
        )
        .action(async (options: { key?: string | true }) => {
            const { loginCommand } = await import('./login.js')
            return loginCommand(options)
        })

    auth.command('logout')
        .description('Invalidate the current session and remove stored credentials')
        .action(async () => {
            const { logoutCommand } = await import('./logout.js')
            return logoutCommand()
        })

    auth.command('status')
        .description('Show current authentication status')
        .option('--json', 'Output as JSON')
        .action(async () => {
            const { statusCommand } = await import('./status.js')
            return statusCommand()
        })
}
