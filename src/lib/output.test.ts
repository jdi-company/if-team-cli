import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { printKeyValue, printTable } from './output.js'

// Strip ANSI escapes so assertions don't depend on chalk's coloring.
function strip(s: string): string {
    // eslint-disable-next-line no-control-regex
    return s.replace(/\x1b\[[0-9;]*m/g, '')
}

let logs: string[] = []
const logSpy = vi.fn((...args: unknown[]) => {
    logs.push(args.map((a) => strip(String(a))).join(' '))
})

beforeEach(() => {
    logs = []
    vi.spyOn(console, 'log').mockImplementation(logSpy)
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('printTable', () => {
    it('prints a header row and aligns columns to widest cell', () => {
        printTable(
            [
                { id: 1, name: 'A' },
                { id: 200, name: 'Banana' },
            ],
            [
                { header: 'ID', get: (r) => r.id },
                { header: 'NAME', get: (r) => r.name },
            ],
        )

        expect(logs).toHaveLength(3)
        // Header pads ID to width 3 ("200" is widest)
        expect(logs[0]).toBe('ID   NAME')
        // Last column not padded
        expect(logs[1]).toBe('1    A')
        expect(logs[2]).toBe('200  Banana')
    })

    it('renders "(no results)" when the rows array is empty', () => {
        printTable([], [{ header: 'ID', get: (r: { id: number }) => r.id }])
        expect(logs).toEqual(['(no results)'])
    })

    it('renders null / undefined cell values as empty strings', () => {
        printTable(
            [{ id: 1, name: null as string | null }],
            [
                { header: 'ID', get: (r) => r.id },
                { header: 'NAME', get: (r) => r.name },
            ],
        )
        // ID pads to header width 2 ("ID"), 2-space separator, last col (NAME) unpadded.
        expect(logs[1]).toBe('1   ')
    })
})

describe('printKeyValue', () => {
    it('aligns keys to the widest key', () => {
        printKeyValue([
            ['ID', 1],
            ['Description', 'hello'],
        ])
        expect(logs[0]).toBe('ID           1')
        expect(logs[1]).toBe('Description  hello')
    })

    it('renders null / undefined as em-dash', () => {
        printKeyValue([['Status', null]])
        expect(logs[0]).toBe('Status  —')
    })
})
