import * as readline from 'node:readline'

export function promptText(query: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
        rl.question(query, (answer) => {
            rl.close()
            resolve(answer.trim())
        })
    })
}

// Silent password prompt — nothing is echoed (enterprise standard: sudo, ssh, gh auth login).
// Echoing dots leaks password length to shoulder-surfing observers.
// Falls back to plain readline when stdin is not a TTY (piped input, CI).
export function promptPassword(query: string): Promise<string> {
    if (!process.stdin.isTTY) return promptText(query)

    return new Promise((resolve) => {
        process.stdout.write(query)
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.setEncoding('utf8')

        let value = ''

        const handler = (char: string) => {
            const code = char.charCodeAt(0)

            if (char === '\r' || char === '\n' || code === 4 /* Ctrl+D */) {
                process.stdin.setRawMode(false)
                process.stdin.pause()
                process.stdin.removeListener('data', handler)
                process.stdout.write('\n')
                resolve(value)
                return
            }

            if (code === 3 /* Ctrl+C */) {
                process.stdin.setRawMode(false)
                process.stdin.pause()
                process.stdin.removeListener('data', handler)
                process.stdout.write('\n')
                process.exit(0)
            }

            if (code === 127 /* Backspace */) {
                if (value.length > 0) value = value.slice(0, -1)
                return
            }

            // Paste events arrive as a multi-character string in one data event.
            // Iterate each character; accept printable chars only, echo nothing.
            for (const c of char) {
                if (c.charCodeAt(0) >= 32) value += c
            }
        }

        process.stdin.on('data', handler)
    })
}

export async function promptCompany(
    companies: Array<{ id: number; name: string }>,
): Promise<{ id: number; name: string }> {
    if (companies.length === 1) return companies[0]

    console.log('\nSelect company:')
    companies.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (ID: ${c.id})`))

    while (true) {
        const raw = await promptText(`Enter number [1]: `)
        const n = raw === '' ? 1 : parseInt(raw, 10)
        if (!isNaN(n) && n >= 1 && n <= companies.length) {
            return companies[n - 1]
        }
        console.log(`  Please enter a number between 1 and ${companies.length}.`)
    }
}
