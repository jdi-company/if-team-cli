import chalk from 'chalk'
import { getCompanies, loginRequest, validateApiKey } from '../../lib/api/client.js'
import { type StoreResult, storeCredentials } from '../../lib/auth-store.js'
import { CliError } from '../../lib/errors.js'
import { isJsonMode } from '../../lib/global-args.js'
import { printJson, printSuccess } from '../../lib/output.js'
import { promptCompany, promptPassword, promptText } from '../../lib/prompt.js'
import { startSpinner, stopSpinner } from '../../lib/spinner.js'

export interface LoginOptions {
    key?: string | true
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
    // Resolve the API key from three possible sources:
    //   --key           → options.key === true  → prompt silently (no shell history)
    //   --key <value>   → options.key is string → use directly, warn about history
    //   (no flag)       → check IF_TEAM_TOKEN env var, else fall through to JWT mode
    let resolvedKey: string | undefined
    if (options.key === true) {
        resolvedKey = await promptPassword('API key: ')
        if (!resolvedKey) throw new CliError('MISSING_CONTENT', 'API key is required.')
    } else if (typeof options.key === 'string') {
        resolvedKey = options.key
        if (!isJsonMode()) {
            console.warn(
                chalk.yellow(
                    '⚠  Tip: use `--key` without a value to avoid storing the key in shell history.',
                ),
            )
        }
    } else {
        resolvedKey = process.env.IF_TEAM_TOKEN
    }

    // ── API key mode ──────────────────────────────────────────────────────────
    // API keys cannot call /auth/profile or /companies — those require Bearer JWT.
    // We temporarily authenticate with email + password to discover the company
    // list, then discard the JWT and store only the API key.
    if (resolvedKey) {
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

        let companyList = response.companies ?? []
        if (companyList.length === 0) {
            startSpinner('Fetching your companies…')
            try {
                companyList = await getCompanies(response.access_token)
            } finally {
                stopSpinner()
            }
        }

        const company = await promptCompany(
            companyList.map((c) => ({ id: c.id, name: c.name })),
        )

        startSpinner('Validating API key…')
        try {
            await validateApiKey(resolvedKey, company.id)
        } finally {
            stopSpinner()
        }

        // JWT is discarded here — only the API key is persisted
        const result = storeCredentials({
            mode: 'api-key',
            key: resolvedKey,
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

    let companyList = response.companies ?? []
    if (companyList.length === 0) {
        startSpinner('Fetching your companies…')
        try {
            companyList = await getCompanies(response.access_token)
        } finally {
            stopSpinner()
        }
    }

    const company = await promptCompany(
        companyList.map((c) => ({ id: c.id, name: c.name })),
    )

    const result = storeCredentials({
        mode: 'jwt',
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        userId: response.user.id,
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
