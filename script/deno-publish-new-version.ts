async function run(simpleCmd: string, args?: string[]) {
    if (!args) {
        const arr = simpleCmd.split(' ')
        simpleCmd = arr[0]
        args = arr.slice(1)
    }

    const cmd = new Deno.Command(simpleCmd, {
        args,
        stdout: 'piped',
        stderr: 'piped'
    })
    const { code, stdout, stderr } = await cmd.output()
    if (code !== 0) {
        console.error(`Error: ${new TextDecoder().decode(stderr)}`)
        Deno.exit(code)
    }
    return new TextDecoder().decode(stdout)
}

const json = JSON.parse(Deno.readTextFileSync('deno.json'))
// increase the semver version by 1
const version = json.version.split('.').map(Number)
console.log(`current version: ${json.version}`)

version[2]++
json.version = version.join('.')
Deno.writeTextFileSync('deno.json', JSON.stringify(json, null, 2))

console.log(`new version: ${json.version}`)

const commitMessage = Deno.args[0] || prompt('Enter commit message: ')
if (!commitMessage) throw new Error('Commit message is required')

console.log(`committing changes...`)
await run(`git add *`)
await run('git', ['commit', '-m', "${commitMessage}"])

console.log(`publishing new version...`)
await run(`deno publish`)

