import { describe, expect, it } from 'vitest'
import { buildQuery } from './list.js'

describe('project list — buildQuery', () => {
    it('returns an empty object when no flags are passed', () => {
        expect(buildQuery({})).toEqual({})
    })

    it('maps --status to filter[status_id][]', () => {
        expect(buildQuery({ status: '5' })).toEqual({ 'filter[status_id][]': '5' })
    })

    it('forwards --page and --limit', () => {
        expect(buildQuery({ page: '3', limit: '20' })).toEqual({ page: '3', limit: '20' })
    })

    it('combines every flag correctly', () => {
        expect(buildQuery({ status: '5', page: '3', limit: '20' })).toEqual({
            'filter[status_id][]': '5',
            page: '3',
            limit: '20',
        })
    })
})
