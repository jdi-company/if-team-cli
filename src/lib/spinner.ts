import ora, { type Ora } from 'ora'
import { isJsonMode, isNdjsonMode } from './global-args.js'

let spinner: Ora | null = null

function isSpinnerDisabled(): boolean {
    return isJsonMode() || isNdjsonMode() || process.argv.includes('--no-spinner')
}

export function startSpinner(text: string): void {
    if (isSpinnerDisabled()) return
    spinner = ora(text).start()
}

export function stopSpinner(): void {
    spinner?.stop()
    spinner = null
}

export function succeedSpinner(text?: string): void {
    if (spinner) {
        spinner.succeed(text)
        spinner = null
    }
}

export function failSpinner(text?: string): void {
    if (spinner) {
        spinner.fail(text)
        spinner = null
    }
}
