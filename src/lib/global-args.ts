export function isJsonMode(): boolean {
    return process.argv.includes('--json')
}

export function isNdjsonMode(): boolean {
    return process.argv.includes('--ndjson')
}

export function isQuietMode(): boolean {
    return process.argv.includes('--quiet') || process.argv.includes('-q')
}
