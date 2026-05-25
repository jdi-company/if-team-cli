let verbosity = 0

export function initializeLogger(): void {
    verbosity = process.argv.filter((a) => /^-v+$/.test(a)).reduce((acc, a) => acc + (a.length - 1), 0)
}

export function log(level: 1 | 2 | 3 | 4, ...args: unknown[]): void {
    if (verbosity >= level) {
        console.error(...args)
    }
}
