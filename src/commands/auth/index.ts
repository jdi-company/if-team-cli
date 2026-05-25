import type { Command } from 'commander'

export function registerAuthCommand(program: Command): void {
    const auth = program.command('auth').description('Manage authentication')

    auth.command('login')
        .description('Authenticate with if-team')
        .option('--token <token>', 'API token (or set IF_TEAM_TOKEN env var)')
        .action(async (options: { token?: string }) => {
            const { loginCommand } = await import('./login.js')
            return loginCommand(options)
        })

    auth.command('logout').description('Remove stored credentials').action(async () => {
        const { logoutCommand } = await import('./logout.js')
        return logoutCommand()
    })

    auth.command('status').description('Show current authentication status').action(async () => {
        const { statusCommand } = await import('./status.js')
        return statusCommand()
    })
}
