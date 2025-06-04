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

async function isWorkingDirClean() {
    const cmd = new Deno.Command('git', {
        args: ['status', '--porcelain'],
        stdout: 'piped',
        stderr: 'piped'
    })
    const { code, stdout } = await cmd.output()
    if (code !== 0) {
        console.error(`Error: ${new TextDecoder().decode(stdout)}`)
    }
    return new TextDecoder().decode(stdout).trim() === ''
}

function readVersion(manifestPath: string) {
    const json = JSON.parse(Deno.readTextFileSync(manifestPath))
    const version = (json.version || '0.0.0').split('.').map(Number)
    return version as [number, number, number]
}

function writeVersion(manifestPath: string, version: [number, number, number]) {
    const versionStr = version.join('.')
    const json = JSON.parse(Deno.readTextFileSync(manifestPath))
    json.version = versionStr
    Deno.writeTextFileSync(manifestPath, JSON.stringify(json, null, 2))
    console.log(`Updated version to ${versionStr} in ${manifestPath}`)
}

function main() {
    const version = readVersion('deno.json')
    console.log(`Current version: ${version.join('.')}`)
    version[2]++
    console.log(`New version: ${version.join('.')}`)

    writeVersion('deno.json', version)
    writeVersion('package.json', version)
}

main()