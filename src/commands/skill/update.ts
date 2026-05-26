import { CliError } from '../../lib/errors.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson, printSuccess } from '../../lib/output.js'
import { getInstaller, listAgents } from '../../lib/skills/index.js'
import { updateAllInstalledSkills } from '../../lib/skills/update-installed.js'

interface Options {
    local?: boolean
    json?: boolean
}

export async function updateCommand(agent: string | undefined, options: Options): Promise<void> {
    const local = options.local === true

    if (!agent) {
        const result = await updateAllInstalledSkills(local)
        if (options.json || isJsonMode()) {
            printJson({ local, ...result })
            return
        }
        if (result.updated.length === 0 && result.skipped.length === listAgents().length) {
            printSuccess('No installed skills to update')
            return
        }
        printSuccess(
            `Updated ${result.updated.length} skill(s)${
                result.updated.length ? `: ${result.updated.join(', ')}` : ''
            }`,
        )
        if (result.errors.length > 0) {
            console.error(`Errors updating: ${result.errors.join(', ')}`)
        }
        return
    }

    const installer = getInstaller(agent)
    if (!installer) {
        throw new CliError(
            'INVALID_OPTIONS',
            `Unknown agent: ${agent}`,
            [`Supported agents: ${listAgents().join(', ')}`],
        )
    }

    const installed = await installer.isInstalled(local)
    if (!installed) {
        throw new CliError(
            'NOT_FOUND',
            `${agent} skill is not installed at ${installer.getInstallPath(local)}`,
            [`Run \`if-team skill install ${agent}${local ? ' --local' : ''}\` first.`],
        )
    }

    await installer.update(local)

    if (options.json || isJsonMode()) {
        printJson({ agent, updated: true, path: installer.getInstallPath(local), local })
        return
    }

    printSuccess(`Updated ${agent} skill at ${installer.getInstallPath(local)}`)
}
