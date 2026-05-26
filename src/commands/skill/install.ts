import { CliError } from '../../lib/errors.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson, printSuccess } from '../../lib/output.js'
import { getInstaller, listAgents } from '../../lib/skills/index.js'

interface Options {
    local?: boolean
    force?: boolean
    json?: boolean
}

export async function installCommand(agent: string, options: Options): Promise<void> {
    const installer = getInstaller(agent)
    if (!installer) {
        throw new CliError(
            'INVALID_OPTIONS',
            `Unknown agent: ${agent}`,
            [`Supported agents: ${listAgents().join(', ')}`],
        )
    }

    const local = options.local === true
    const force = options.force === true

    await installer.install(local, force)

    const path = installer.getInstallPath(local)

    if (options.json || isJsonMode()) {
        printJson({ agent, installed: true, path, local })
        return
    }

    printSuccess(`Installed ${agent} skill at ${path}`)
}
