import { describe, expect, it } from 'vitest'

const token = process.env.IF_TEAM_INT_TOKEN
const company = process.env.IF_TEAM_INT_COMPANY_ID
const userId = process.env.IF_TEAM_INT_USER_ID
const base = process.env.IF_TEAM_INT_API_URL ?? 'https://api.demo.if.team'

describe.skipIf(!token || !company)('task list — live filter contract', () => {
    it('accepts --finish-at as an indexed [0]/[1] tuple', async () => {
        const url = new URL(`${base}/tasks`)
        url.searchParams.set('company_id', company!)
        url.searchParams.set('limit', '1')
        url.searchParams.set('filter[finish_at][0]', '2026-01-01')
        url.searchParams.set('filter[finish_at][1]', '2026-12-31')
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        })
        expect(res.status).toBe(200)
    })

    it.skipIf(!userId)('accepts --assignee as filter[responsible_id][]', async () => {
        const url = new URL(`${base}/tasks`)
        url.searchParams.set('company_id', company!)
        url.searchParams.set('limit', '1')
        url.searchParams.set('filter[responsible_id][]', userId!)
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        })
        expect(res.status).toBe(200)
    })
})
