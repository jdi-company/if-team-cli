import type { Command } from 'commander'

export function registerSkillCommand(program: Command): void {
    const skill = program
        .command('skill')
        .description('Install the if-team agent skill into Claude Code, Cursor, Codex, etc.')
        .addHelpText(
            'after',
            `
Examples:
  if-team skill list                          # show supported agents + install state
  if-team skill install claude-code           # install into ~/.claude/skills/if-team-cli/
  if-team skill install cursor --local        # install into ./.cursor/skills/if-team-cli/
  if-team skill install universal             # install into ~/.agents/skills/if-team-cli/
  if-team skill install claude-code --force   # overwrite existing
  if-team skill update claude-code            # refresh content
  if-team skill uninstall cursor              # remove`,
        )

    skill.command('list')
        .description('List supported agents and their installation status')
        .option('--json', 'Output as JSON')
        .option('--local', 'Check local install state (current project) instead of home directory')
        .action(async (options: { json?: boolean; local?: boolean }) => {
            const { listCommand } = await import('./list.js')
            return listCommand(options)
        })

    skill.command('install <agent>')
        .description('Install the if-team skill for the given agent')
        .option('--local', 'Install into the current project (./.<agent>/skills/...) instead of $HOME')
        .option('--force', 'Overwrite an existing skill file')
        .option('--json', 'Output as JSON')
        .action(async (agent: string, options: { local?: boolean; force?: boolean; json?: boolean }) => {
            const { installCommand } = await import('./install.js')
            return installCommand(agent, options)
        })

    skill.command('update [agent]')
        .description('Refresh installed skill content. Without an agent, updates every installed skill.')
        .option('--local', 'Operate on local installs (current project) instead of $HOME')
        .option('--json', 'Output as JSON')
        .action(async (agent: string | undefined, options: { local?: boolean; json?: boolean }) => {
            const { updateCommand } = await import('./update.js')
            return updateCommand(agent, options)
        })

    skill.command('uninstall <agent>')
        .description('Remove the if-team skill for the given agent')
        .option('--local', 'Operate on local installs (current project) instead of $HOME')
        .option('--json', 'Output as JSON')
        .action(async (agent: string, options: { local?: boolean; json?: boolean }) => {
            const { uninstallCommand } = await import('./uninstall.js')
            return uninstallCommand(agent, options)
        })
}
