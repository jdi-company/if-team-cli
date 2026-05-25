import chalk from 'chalk'
import { loginRequest, validateApiKey } from '../../lib/api/client.js'
import { type StoreResult, storeCredentials } from '../../lib/auth-store.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson, printSuccess } from '../../lib/output.js'
import { promptCompany, promptPassword, promptText } from '../../lib/prompt.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

export interface LoginOptions {
    key?: string
}

function printStorageWarning(result: StoreResult): void {
    if (!result.secure) {
        console.error(
            chalk.yellow(
                `⚠  System keychain unavailable. Credentials stored in plaintext at ${result.fallbackPath}`,
            ),
        )
        console.error(chalk.yellow('   Restrict access: chmod 600 ' + result.fallbackPath))
    }
}

export async function loginCommand(options: LoginOptions): Promise<void> {
    // ── API key mode ──────────────────────────────────────────────────────────
    const keySource = options.key ?? process.env.IF_TEAM_TOKEN

    if (keySource) {
        startSpinner('Validating API key…')
        let user
        try {
            user = await validateApiKey(keySource)
        } finally {
            stopSpinner()
        }

        // API keys are company-scoped; we can't list companies without a
        // company_id, so ask the user to provide it if it can't be inferred.
        // (The profile endpoint doesn't return companies for API key auth.)
        const companyIdRaw = await promptText('Company ID (from your admin dashboard): ')
        const companyId = parseInt(companyIdRaw, 10)
        if (isNaN(companyId) || companyId <= 0) {
            throw new CliError('INVALID_OPTIONS', 'Company ID must be a positive number.')
        }
        const companyName = await promptText('Company name (for display): ')

        const result = storeCredentials({
            mode: 'api-key',
            key: keySource,
            email: user.email,
            name: user.name,
            companyId,
            companyName: companyName.trim() || String(companyId),
        })

        if (isJsonMode()) {
            printJson({ mode: 'api-key', email: user.email, name: user.name, companyId })
            return
        }

        printSuccess(`Logged in as ${chalk.cyan(user.name)} (${user.email})`)
        console.log(`   Company: ${companyName} (ID: ${companyId})`)
        console.log(result.secure
            ? chalk.dim('   API key stored securely in the system keychain.')
            : '')
        printStorageWarning(result)
        return
    }

    // ── Email / password mode ─────────────────────────────────────────────────
    // Password is NEVER accepted as a CLI flag — it would appear in shell
    // history and `ps aux`. Always prompt interactively.
    const email = await promptText('Email: ')
    if (!email) throw new CliError('MISSING_CONTENT', 'Email is required.')

    const password = await promptPassword('Password: ')
    if (!password) throw new CliError('MISSING_CONTENT', 'Password is required.')

    startSpinner('Authenticating…')
    let response
    try {
        response = await loginRequest(email, password)
    } finally {
        stopSpinner()
    }

    const company = await promptCompany(
        response.companies.map((c) => ({ id: c.id, name: c.name })),
    )

    const result = storeCredentials({
        mode: 'jwt',
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        email: response.user.email,
        name: response.user.name,
        companyId: company.id,
        companyName: company.name,
    })

    if (isJsonMode()) {
        printJson({
            mode: 'jwt',
            email: response.user.email,
            name: response.user.name,
            companyId: company.id,
            companyName: company.name,
        })
        return
    }

    printSuccess(`Logged in as ${chalk.cyan(response.user.name)} (${response.user.email})`)
    console.log(`   Company: ${company.name} (ID: ${company.id})`)
    console.log(result.secure
        ? chalk.dim('   Token stored securely in the system keychain.')
        : '')
    printStorageWarning(result)
}
