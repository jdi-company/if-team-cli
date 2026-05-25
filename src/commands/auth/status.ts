import chalk from 'chalk'
import { probeAuth } from '../../lib/api/client.js'
import { loadCredentials } from '../../lib/auth-store.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson } from '../../lib/output.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

function jwtExpiresAt(token: string): Date | null {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
        return new Date((payload.exp as number) * 1000)
    } catch {
        return null
    }
}

export async function statusCommand(): Promise<void> {
    const envKey = process.env.IF_TEAM_TOKEN

    if (envKey) {
        const storedCreds = loadCredentials()
        const envCompanyId = process.env.IF_TEAM_COMPANY_ID
            ? parseInt(process.env.IF_TEAM_COMPANY_ID, 10)
            : undefined
        const companyId = envCompanyId ?? storedCreds?.companyId
        const companyName = storedCreds?.companyName

        if (companyId === undefined) {
            if (isJsonMode()) {
                printJson({ authenticated: true, mode: 'env', source: 'IF_TEAM_TOKEN' })
                return
            }
            console.log(chalk.green('✔ Authenticated via IF_TEAM_TOKEN environment variable'))
            console.log(chalk.dim('  Credentials are session-only and not stored locally.'))
            console.log(chalk.yellow('   ⚠  No company set. Set IF_TEAM_COMPANY_ID or run `if-team auth login`.'))
            return
        }

        startSpinner('Verifying token…')
        try {
            await probeAuth()
        } finally {
            stopSpinner()
        }

        if (isJsonMode()) {
            printJson({
                authenticated: true,
                valid: true,
                mode: 'env',
                source: 'IF_TEAM_TOKEN',
                companyId,
                companyName: companyName ?? null,
            })
            return
        }

        console.log(chalk.green('✔ Authenticated via IF_TEAM_TOKEN environment variable'))
        console.log(chalk.dim('  Credentials are session-only and not stored locally.'))
        console.log(`   Company: ${companyName ?? '(unknown)'} (ID: ${companyId})`)
        console.log(chalk.green('   Token:   ✔ valid'))
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

    startSpinner('Verifying token…')
    try {
        await probeAuth()
    } finally {
        stopSpinner()
    }

    // Reload after probe — JWT may have been silently refreshed by apiRequest
    const freshCreds = loadCredentials() ?? creds

    if (isJsonMode()) {
        if (freshCreds.mode === 'api-key') {
            printJson({
                authenticated: true,
                valid: true,
                mode: 'api-key',
                companyId: freshCreds.companyId,
                companyName: freshCreds.companyName,
            })
        } else {
            const exp = jwtExpiresAt(freshCreds.accessToken)
            printJson({
                authenticated: true,
                valid: true,
                mode: 'jwt',
                email: freshCreds.email,
                name: freshCreds.name,
                companyId: freshCreds.companyId,
                companyName: freshCreds.companyName,
                tokenExpiresAt: exp?.toISOString() ?? null,
            })
        }
        return
    }

    console.log(chalk.green('✔ Authenticated'))
    if (freshCreds.mode === 'jwt') {
        console.log(`   Name:    ${freshCreds.name}`)
        console.log(`   Email:   ${freshCreds.email}`)
    }
    console.log(`   Company: ${freshCreds.companyName} (ID: ${freshCreds.companyId})`)
    console.log(`   Mode:    ${freshCreds.mode === 'api-key' ? 'API key' : 'Email / password (JWT)'}`)

    if (freshCreds.mode === 'jwt') {
        const exp = jwtExpiresAt(freshCreds.accessToken)
        if (exp) {
            console.log(chalk.green(`   Token:   ✔ valid (expires ${exp.toLocaleString()})`))
        } else {
            console.log(chalk.green('   Token:   ✔ valid'))
        }
    } else {
        console.log(chalk.green('   Token:   ✔ valid'))
    }
}
