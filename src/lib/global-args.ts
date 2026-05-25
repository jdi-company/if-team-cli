export function isJsonMode(): boolean {
    return process.argv.includes('--json')
}

export function isNdjsonMode(): boolean {
    return process.argv.includes('--ndjson')
}
