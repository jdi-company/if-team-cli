import { describe, expect, it } from 'vitest'
import { buildCreateBody } from './create.js'
import { buildUpdateBody, hydrateUpdateBody } from './update.js'

describe('client create — buildCreateBody', () => {
    it('returns an empty body when nothing is passed', () => {
        expect(buildCreateBody({})).toEqual({})
    })

    it('maps named flags onto API field names', () => {
        expect(
            buildCreateBody({
                name: 'Acme Inc',
                type: 'legal',
                email: 'billing@acme.test',
                phone: '+123',
                comment: 'VIP',
                address: '1 Main St',
                country: '1',
                iban: 'UA123',
                bank: 'PrivatBank',
                registrationNumber: 'RN-9',
                telegram: '@acme',
                whatsapp: '+123',
                dateOfBirth: '1990-01-01',
                responsible: ['4567'],
                role: ['42', '12'],
                lead: '200',
            }),
        ).toEqual({
            name: 'Acme Inc',
            type: 'legal',
            email: 'billing@acme.test',
            phone: '+123',
            comment: 'VIP',
            address: '1 Main St',
            country_id: 1,
            iban: 'UA123',
            bank: 'PrivatBank',
            registration_number: 'RN-9',
            telegram: '@acme',
            whatsapp: '+123',
            date_of_birth: '1990-01-01',
            responsible_ids: ['4567'],
            client_role_ids: ['42', '12'],
            lead_id: 200,
        })
    })

    it('blends --data with flags, letting flags win', () => {
        expect(
            buildCreateBody({ name: 'Override', data: '{"name":"Original","comment":"keep"}' }),
        ).toEqual({ name: 'Override', comment: 'keep' })
    })
})

describe('client update — buildUpdateBody', () => {
    it('returns {} when nothing is passed', () => {
        expect(buildUpdateBody({})).toEqual({})
    })

    it('maps only the provided flags', () => {
        expect(buildUpdateBody({ phone: '+999', country: '2' })).toEqual({
            phone: '+999',
            country_id: 2,
        })
    })
})

describe('client update — hydrateUpdateBody', () => {
    const current = {
        name: 'Acme Inc',
        type: 'legal',
        email: 'billing@acme.test',
        phone: '+1',
        comment: 'VIP',
        address: '1 Main St',
        country_id: 1,
        iban: 'UA123',
        bank: 'PrivatBank',
        registration_number: 'RN-9',
        telegram: null,
        whatsapp: null,
        date_of_birth: null,
        responsibles: [{ id: 4567 }],
        roles: [{ id: 42 }],
        files: [],
    }

    it('preserves unchanged fields (a partial PATCH would reset them)', () => {
        const body = hydrateUpdateBody({ phone: '+999' }, current)
        expect(body.type).toBe('legal')
        expect(body.name).toBe('Acme Inc')
        expect(body.email).toBe('billing@acme.test')
        expect(body.phone).toBe('+999')
    })

    it('lets the caller change applies on top of the hydrated base', () => {
        const body = hydrateUpdateBody({ type: 'individual' }, current)
        expect(body.type).toBe('individual')
    })

    it('maps current responsibles/roles back to id arrays', () => {
        const body = hydrateUpdateBody({}, current)
        expect(body.responsible_ids).toEqual([4567])
        expect(body.client_role_ids).toEqual([42])
        expect(body.file_ids).toEqual([])
    })

    it('unwraps an i18n name object', () => {
        const body = hydrateUpdateBody({}, { ...current, name: { name: 'Wrapped' } })
        expect(body.name).toBe('Wrapped')
    })
})
