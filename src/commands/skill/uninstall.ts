import { CliError } from '../../lib/errors.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson, printSuccess } from '../../lib/output.js'
import { getInstaller, listAgents } from '../../lib/skills/index.js'

interface Options {
    local?: boolean
    json?: boolean
}

export async function uninstallCommand(agent: string, options: Options): Promise<void> {
    const installer = getInstaller(agent)
    if (!installer) {
        throw new CliError(
            'INVALID_OPTIONS',
            `Unknown agent: ${agent}`,
            [`Supported agents: ${listAgents().join(', ')}`],
        )
    }

    const local = options.local === true
    const path = installer.getInstallPath(local)

    await installer.uninstall(local)

    if (options.json || isJsonMode()) {
        printJson({ agent, uninstalled: true, path, local })
        return
    }

    printSuccess(`Uninstalled ${agent} skill from ${path}`)
}
