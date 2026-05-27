import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildQuery } from './list.js'

describe('task list — buildQuery', () => {
    it('returns an empty object when no flags are passed', () => {
        expect(buildQuery({})).toEqual({})
    })

    it('maps --project to the direct project_id param, not a filter', () => {
        const q = buildQuery({ project: '12' })
        expect(q).toEqual({ project_id: '12' })
        expect(q).not.toHaveProperty('filter[project_id][]')
    })

    it('maps --status to filter[status_id][]', () => {
        expect(buildQuery({ status: '3' })).toEqual({ 'filter[status_id][]': '3' })
    })

    it('maps --start-at and --finish-at to indexed [0]/[1] tuple filter keys', () => {
        expect(buildQuery({ startAt: '2026-05-01', finishAt: '2026-05-31' })).toEqual({
            'filter[start_at][0]': '2026-05-01',
            'filter[start_at][1]': '2026-05-01',
            'filter[finish_at][0]': '2026-05-31',
            'filter[finish_at][1]': '2026-05-31',
        })
    })

    it('forwards --page and --limit', () => {
        expect(buildQuery({ page: '2', limit: '50' })).toEqual({ page: '2', limit: '50' })
    })

    it('combines every flag correctly', () => {
        expect(
            buildQuery({
                project: '12',
                status: '3',
                startAt: '2026-05-01',
                finishAt: '2026-05-31',
                page: '2',
                limit: '50',
            }),
        ).toEqual({
            project_id: '12',
            'filter[status_id][]': '3',
            'filter[start_at][0]': '2026-05-01',
            'filter[start_at][1]': '2026-05-01',
            'filter[finish_at][0]': '2026-05-31',
            'filter[finish_at][1]': '2026-05-31',
            page: '2',
            limit: '50',
        })
    })

    it('throws INVALID_OPTIONS for malformed --start-at', () => {
        expect(() => buildQuery({ startAt: '05/01/2026' })).toThrow(CliError)
        try {
            buildQuery({ startAt: '05/01/2026' })
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_OPTIONS')
        }
    })

    it('throws INVALID_OPTIONS for malformed --finish-at', () => {
        expect(() => buildQuery({ finishAt: 'tomorrow' })).toThrow(CliError)
    })
})
