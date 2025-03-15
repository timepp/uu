// update the hash in the uu.ts file with the content of the file
// starting from the non-empty line after the comment to the end of the file

// Get the hash and hashable content from the file
function parseFile(lines: string[]) {
    const hashPrefix = '// hash:'
    const hashLine = lines.findIndex(line => line.startsWith(hashPrefix))
    if (hashLine === -1) throw new Error('Hash line not found')
    const hash = lines[hashLine].slice(hashPrefix.length).trim()
    const contentLine = lines.findIndex((l, index) => index > hashLine && l.trim() !== '' && !l.startsWith('//'))
    const content = lines.slice(contentLine).join('\n').trim()
    return { hash, hashLine, content, contentLine }
}

async function hashString(str: string) {
    const arr = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    return Array.from(new Uint8Array(arr)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function validateHash(file: string) {
    const lines = Deno.readTextFileSync(file).split(/\r?\n/g)
    const { hash, content } = parseFile(lines)
    const newHash = await hashString(content)
    return {
        oldHash: hash,
        newHash,
        isValid: hash === newHash,
    }
}

export async function updateHash(file: string) {
    const lines = Deno.readTextFileSync(file).split(/\r?\n/g)
    const { hash, hashLine, content } = parseFile(lines)
    const newHash = await hashString(content)
    lines[hashLine] = `// hash: ${newHash}`
    const newContent = lines.join('\n')
    Deno.writeTextFileSync(file, newContent)
    return { oldHash: hash, newHash }
}

if (import.meta.main) {
    const myDir = import.meta.dirname
    const uuFile = `${myDir}/../uu.ts`
    const result = await updateHash(uuFile)
    console.log(`Updated hash in ${uuFile}`, result)
}
