import chalk from 'chalk'

export async function statusCommand(): Promise<void> {
    const token = process.env.IF_TEAM_TOKEN
    if (!token) {
        console.log(chalk.yellow('Not authenticated. Run `if-team auth login --token <token>`.'))
        return
    }
    // TODO: fetch current user from API
    console.log(chalk.green('Authenticated via IF_TEAM_TOKEN.'))
}
