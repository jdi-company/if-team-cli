import { CliError } from '../../lib/errors.js'

// Workload `time` is stored in whole seconds. The CLI accepts friendly
// durations on input — `2h`, `90m`, `2h30m`, `45s`, `1h30m`, or raw seconds
// (`7200`) — and renders seconds back as `2h 30m` for human output.

const UNIT_RE = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i

export function parseDuration(input: string, flag = '--duration'): number {
    const trimmed = input.trim()
    if (trimmed === '') {
        throw new CliError('INVALID_OPTIONS', `${flag} must not be empty.`)
    }

    // Raw seconds.
    if (/^\d+$/.test(trimmed)) {
        return Number(trimmed)
    }

    const m = UNIT_RE.exec(trimmed)
    if (!m || (m[1] === undefined && m[2] === undefined && m[3] === undefined)) {
        throw new CliError(
            'INVALID_OPTIONS',
            `${flag} "${input}" is not a valid duration.`,
            ['Use forms like 2h, 90m, 2h30m, 45s, or a raw number of seconds (7200).'],
        )
    }

    const hours = Number(m[1] ?? 0)
    const minutes = Number(m[2] ?? 0)
    const seconds = Number(m[3] ?? 0)
    return hours * 3600 + minutes * 60 + seconds
}

export function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return ''
    const total = Math.max(0, Math.round(seconds))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    const parts: string[] = []
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    if (s) parts.push(`${s}s`)
    return parts.length > 0 ? parts.join(' ') : '0s'
}

// Normalize a `--date`/`--start-at` value into the ISO 8601 datetime the
// workload API expects. A bare YYYY-MM-DD is expanded to UTC midnight; any
// other value (already a datetime) is passed through unchanged.
export function toIsoDateTime(input: string | undefined): string | undefined {
    if (input === undefined) return undefined
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input}T00:00:00.000Z`
    return input
}
