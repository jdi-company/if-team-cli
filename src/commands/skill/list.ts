import { CliError } from '../../lib/errors.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson, printTable } from '../../lib/output.js'
import { skillInstallers } from '../../lib/skills/index.js'

interface Options {
    json?: boolean
    local?: boolean
}

export async function listCommand(options: Options): Promise<void> {
    const local = options.local === true

    const rows = await Promise.all(
        Object.entries(skillInstallers).map(async ([agent, installer]) => ({
            agent,
            description: installer.description,
            installed: await installer.isInstalled(local),
            path: installer.getInstallPath(local),
        })),
    )

    if (options.json || isJsonMode()) {
        printJson({ local, agents: rows })
        return
    }

    if (rows.length === 0) {
        throw new CliError('INTERNAL_ERROR', 'No skill installers registered')
    }

    printTable(rows, [
        { header: 'Agent', get: (r) => r.agent },
        { header: 'Installed', get: (r) => (r.installed ? '✔' : '—') },
        { header: 'Path', get: (r) => r.path },
    ])
}
