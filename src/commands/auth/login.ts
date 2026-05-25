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
    const keySource = options.key ?? process.env.IF_TEAM_TOKEN

    // ── API key mode ──────────────────────────────────────────────────────────
    // API keys cannot call /auth/profile or /companies — those require Bearer JWT.
    // We temporarily authenticate with email + password to discover the company
    // list, then discard the JWT and store only the API key.
    if (keySource) {
        console.log(chalk.dim('Email and password are needed once to discover your companies.'))
        console.log(chalk.dim('They will not be stored.\n'))

        const email = await promptText('Email: ')
        if (!email) throw new CliError('MISSING_CONTENT', 'Email is required.')

        const password = await promptPassword('Password: ')
        if (!password) throw new CliError('MISSING_CONTENT', 'Password is required.')

        startSpinner('Fetching your companies…')
        let response
        try {
            response = await loginRequest(email, password)
        } finally {
            stopSpinner()
        }

        const company = await promptCompany(
            response.companies.map((c) => ({ id: c.id, name: c.name })),
        )

        startSpinner('Validating API key…')
        try {
            await validateApiKey(keySource, company.id)
        } finally {
            stopSpinner()
        }

        // JWT is discarded here — only the API key is persisted
        const result = storeCredentials({
            mode: 'api-key',
            key: keySource,
            companyId: company.id,
            companyName: company.name,
        })

        if (isJsonMode()) {
            printJson({ mode: 'api-key', companyId: company.id, companyName: company.name })
            return
        }

        printSuccess(`Logged in to ${chalk.cyan(company.name)} via API key`)
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
