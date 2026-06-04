import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { formatDuration, parseDuration, toIsoDateTime } from './duration.js'

describe('parseDuration', () => {
    it('parses raw seconds', () => {
        expect(parseDuration('7200')).toBe(7200)
        expect(parseDuration('0')).toBe(0)
    })

    it('parses single units', () => {
        expect(parseDuration('2h')).toBe(7200)
        expect(parseDuration('90m')).toBe(5400)
        expect(parseDuration('45s')).toBe(45)
    })

    it('parses combined units', () => {
        expect(parseDuration('2h30m')).toBe(9000)
        expect(parseDuration('1h30m15s')).toBe(5415)
    })

    it('is case-insensitive and trims whitespace', () => {
        expect(parseDuration('  2H30M  ')).toBe(9000)
    })

    it('throws on empty input', () => {
        try {
            parseDuration('   ')
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_OPTIONS')
        }
    })

    it('throws on garbage input', () => {
        expect(() => parseDuration('abc')).toThrow(CliError)
        expect(() => parseDuration('2x')).toThrow(CliError)
        expect(() => parseDuration('2h3')).toThrow(CliError)
    })
})

describe('formatDuration', () => {
    it('returns empty string for null/undefined', () => {
        expect(formatDuration(null)).toBe('')
        expect(formatDuration(undefined)).toBe('')
    })

    it('formats seconds into h/m/s parts', () => {
        expect(formatDuration(9000)).toBe('2h 30m')
        expect(formatDuration(5400)).toBe('1h 30m')
        expect(formatDuration(45)).toBe('45s')
        expect(formatDuration(5415)).toBe('1h 30m 15s')
    })

    it('renders zero as 0s', () => {
        expect(formatDuration(0)).toBe('0s')
        expect(formatDuration(-10)).toBe('0s')
    })
})

describe('toIsoDateTime', () => {
    it('expands a bare date to UTC midnight', () => {
        expect(toIsoDateTime('2026-06-05')).toBe('2026-06-05T00:00:00.000Z')
    })

    it('passes a full datetime through unchanged', () => {
        expect(toIsoDateTime('2026-06-05T09:30:00.000Z')).toBe('2026-06-05T09:30:00.000Z')
    })

    it('returns undefined for undefined', () => {
        expect(toIsoDateTime(undefined)).toBeUndefined()
    })
})
