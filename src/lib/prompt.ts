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

// Renders each character as ● and handles backspace. Falls back to plain
// readline when stdin is not a TTY (piped input, CI environments).
export function promptPassword(query: string): Promise<string> {
    if (!process.stdin.isTTY) return promptText(query)

    return new Promise((resolve) => {
        process.stdout.write(query)
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.setEncoding('utf8')

        let value = ''

        const handler = (char: string) => {
            switch (char) {
                case '\r':
                case '\n':
                case '': // Ctrl+D — EOF
                    process.stdin.setRawMode(false)
                    process.stdin.pause()
                    process.stdin.removeListener('data', handler)
                    process.stdout.write('\n')
                    resolve(value)
                    break

                case '': // Ctrl+C
                    process.stdin.setRawMode(false)
                    process.stdin.pause()
                    process.stdin.removeListener('data', handler)
                    process.stdout.write('\n')
                    process.exit(0)
                    break

                case '': // Backspace
                    if (value.length > 0) {
                        value = value.slice(0, -1)
                        process.stdout.clearLine(0)
                        process.stdout.cursorTo(0)
                        process.stdout.write(query + '●'.repeat(value.length))
                    }
                    break

                default:
                    // Accept only printable ASCII + extended characters
                    if (char >= ' ') {
                        value += char
                        process.stdout.write('●')
                    }
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
