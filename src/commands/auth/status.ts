import chalk from 'chalk'
import { loadCredentials } from '../../lib/auth-store.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson } from '../../lib/output.js'

function jwtExpiresAt(token: string): Date | null {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
        return new Date((payload.exp as number) * 1000)
    } catch {
        return null
    }
}

export function statusCommand(): void {
    const envKey = process.env.IF_TEAM_TOKEN

    if (envKey) {
        if (isJsonMode()) {
            printJson({ authenticated: true, mode: 'env', source: 'IF_TEAM_TOKEN' })
            return
        }
        console.log(chalk.green('✔ Authenticated via IF_TEAM_TOKEN environment variable'))
        console.log(chalk.dim('  Credentials are session-only and not stored locally.'))
        return
    }

    const creds = loadCredentials()

    if (!creds) {
        if (isJsonMode()) {
            printJson({ authenticated: false })
            return
        }
        console.log(chalk.yellow('✖ Not authenticated. Run `if-team auth login`.'))
        return
    }

    if (isJsonMode()) {
        if (creds.mode === 'api-key') {
            printJson({
                authenticated: true,
                mode: 'api-key',
                companyId: creds.companyId,
                companyName: creds.companyName,
            })
        } else {
            const exp = jwtExpiresAt(creds.accessToken)
            printJson({
                authenticated: true,
                mode: 'jwt',
                email: creds.email,
                name: creds.name,
                companyId: creds.companyId,
                companyName: creds.companyName,
                tokenExpiresAt: exp?.toISOString() ?? null,
            })
        }
        return
    }

    console.log(chalk.green('✔ Authenticated'))
    if (creds.mode === 'jwt') {
        console.log(`   Name:    ${creds.name}`)
        console.log(`   Email:   ${creds.email}`)
    }
    console.log(`   Company: ${creds.companyName} (ID: ${creds.companyId})`)
    console.log(`   Mode:    ${creds.mode === 'api-key' ? 'API key' : 'Email / password (JWT)'}`)

    if (creds.mode === 'jwt') {
        const exp = jwtExpiresAt(creds.accessToken)
        if (exp) {
            const expired = exp < new Date()
            const label = expired ? chalk.red('expired') : chalk.green('valid')
            console.log(`   Token:   ${label} (expires ${exp.toLocaleString()})`)
        }
    }
}
