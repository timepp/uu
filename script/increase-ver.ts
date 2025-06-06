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