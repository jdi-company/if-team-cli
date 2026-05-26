import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildCreateBody, parseProjectId } from './create.js'
import { buildUpdateBody } from './update.js'

describe('task create — parseProjectId', () => {
    it('returns the integer for a valid numeric project id', () => {
        expect(parseProjectId('12')).toBe(12)
    })

    it('throws MISSING_ID when project is omitted', () => {
        try {
            parseProjectId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for garbage input', () => {
        expect(() => parseProjectId('abc')).toThrow(CliError)
    })
})

describe('task create — buildCreateBody', () => {
    it('returns {} when nothing is passed', () => {
        expect(buildCreateBody({})).toEqual({})
    })

    it('maps named flags onto API field names', () => {
        expect(
            buildCreateBody({
                name: 'My task',
                status: '3',
                priority: '2',
                iteration: '7',
                startAt: '2026-06-01',
                finishAt: '2026-06-10',
                timePlan: '3600',
                participant: [5, 8],
                client: ['1'],
            }),
        ).toEqual({
            name: 'My task',
            status_id: 3,
            priority_id: 2,
            iteration_id: 7,
            start_at: '2026-06-01',
            finish_at: '2026-06-10',
            time_plan: 3600,
            participant_ids: [5, 8],
            client_ids: ['1'],
        })
    })

    it('lets named flags override --data', () => {
        expect(
            buildCreateBody({ data: '{"name":"from data"}', name: 'from flag' }),
        ).toEqual({ name: 'from flag' })
    })
})

describe('task update — buildUpdateBody', () => {
    it('returns {} when nothing is passed', () => {
        expect(buildUpdateBody({})).toEqual({})
    })

    it('supports --project (move task) and --iteration on update', () => {
        expect(buildUpdateBody({ project: '99', iteration: '7' })).toEqual({
            project_id: 99,
            iteration_id: 7,
        })
    })
})
