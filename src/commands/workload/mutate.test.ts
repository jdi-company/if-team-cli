import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildLogBody } from './log.js'
import { parseId } from './show.js'
import { buildUpdateBody, hydrateUpdateBody } from './update.js'

describe('workload show — parseId', () => {
    it('returns the integer for a valid numeric id', () => {
        expect(parseId('4567')).toBe(4567)
    })

    it('throws MISSING_ID when id is omitted', () => {
        try {
            parseId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for garbage input', () => {
        expect(() => parseId('abc')).toThrow(CliError)
    })
})

describe('workload log — buildLogBody', () => {
    it('maps named flags onto API field names with parsed duration', () => {
        expect(
            buildLogBody({
                duration: '2h30m',
                date: '2026-06-05',
                comment: 'Pairing',
                participant: '14237',
            }),
        ).toEqual({
            time: 9000,
            start_at: '2026-06-05T00:00:00.000Z',
            comment: 'Pairing',
            participant_id: 14237,
        })
    })

    it('parses raw-second durations', () => {
        const body = buildLogBody({ duration: '7200', date: '2026-06-05' })
        expect(body.time).toBe(7200)
    })

    it('prefers --start-at over --date', () => {
        const body = buildLogBody({
            duration: '1h',
            date: '2026-06-05',
            startAt: '2026-06-05T09:30:00.000Z',
        })
        expect(body.start_at).toBe('2026-06-05T09:30:00.000Z')
    })

    it('leaves participant_id undefined when --participant is "me" (caller fills it)', () => {
        const body = buildLogBody({ duration: '1h', date: '2026-06-05', participant: 'me' })
        expect(body.participant_id).toBeUndefined()
    })

    it('defaults start_at to an ISO datetime when neither --date nor --start-at given', () => {
        const body = buildLogBody({ duration: '1h' })
        expect(typeof body.start_at).toBe('string')
        expect(body.start_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('keeps participant_id supplied via --data', () => {
        const body = buildLogBody({ duration: '1h', date: '2026-06-05', data: '{"participant_id":99}' })
        expect(body.participant_id).toBe(99)
    })

    it('lets --participant override --data', () => {
        const body = buildLogBody({
            duration: '1h',
            date: '2026-06-05',
            participant: '7',
            data: '{"participant_id":99}',
        })
        expect(body.participant_id).toBe(7)
    })
})

describe('workload update — buildUpdateBody', () => {
    it('returns {} when nothing is passed', () => {
        expect(buildUpdateBody({})).toEqual({})
    })

    it('maps named flags onto API field names', () => {
        expect(
            buildUpdateBody({
                duration: '3h',
                date: '2026-06-05',
                comment: 'Revised',
                participant: '14237',
            }),
        ).toEqual({
            time: 10800,
            start_at: '2026-06-05T00:00:00.000Z',
            comment: 'Revised',
            participant_id: 14237,
        })
    })
})

describe('workload update — hydrateUpdateBody', () => {
    const current = {
        time: 3600,
        start_at: '2026-06-03T00:00:00.000Z',
        participant_id: 14237,
        comment: 'original',
    }

    it('fills unchanged required fields from the current entry (API rejects a partial PATCH)', () => {
        expect(hydrateUpdateBody({ comment: 'new note' }, current)).toEqual({
            time: 3600,
            start_at: '2026-06-03T00:00:00.000Z',
            participant_id: 14237,
            comment: 'new note',
        })
    })

    it('lets the user changes override the hydrated values', () => {
        expect(hydrateUpdateBody({ time: 7200 }, current)).toEqual({
            time: 7200,
            start_at: '2026-06-03T00:00:00.000Z',
            participant_id: 14237,
            comment: 'original',
        })
    })

    it('omits comment when the current entry has none', () => {
        expect(
            hydrateUpdateBody({ time: 7200 }, { ...current, comment: null }),
        ).toEqual({
            time: 7200,
            start_at: '2026-06-03T00:00:00.000Z',
            participant_id: 14237,
        })
    })
})
