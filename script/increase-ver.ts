type Manifest = {
    version?: string
    license?: string
    dependencies?: Record<string, string>
    imports?: Record<string, string>
}

function readManifest(manifestPath: string): Manifest {
    return JSON.parse(Deno.readTextFileSync(manifestPath))
}

function readVersion(manifest: Manifest) {
    const version = (manifest.version || '0.0.0').split('.').map(Number)
    return version as [number, number, number]
}

function warnIfDifferent(property: string, denoValue: string | undefined, packageValue: string | undefined) {
    if (denoValue !== packageValue) {
        console.warn(`Warning: ${property} mismatch (deno.json: ${denoValue ?? '(missing)'}, package.json: ${packageValue ?? '(missing)'}).`)
    }
}

function parseNpmSpecifier(specifier: string) {
    const match = specifier.match(/^npm:(@[^/]+\/[^@/]+|[^@/]+)@([^/]+)(?:\/.*)?$/)
    return match ? { packageName: match[1], version: match[2] } : undefined
}

function checkDependencyConsistency(denoManifest: Manifest, packageManifest: Manifest) {
    const denoDependencies = new Map<string, string>()
    for (const specifier of Object.values(denoManifest.imports || {})) {
        const dependency = parseNpmSpecifier(specifier)
        if (dependency) denoDependencies.set(dependency.packageName, dependency.version)
    }

    const packageDependencies = packageManifest.dependencies || {}
    for (const [packageName, packageVersion] of Object.entries(packageDependencies)) {
        warnIfDifferent(`dependency ${packageName}`, denoDependencies.get(packageName), packageVersion)
    }
    for (const [packageName, denoVersion] of denoDependencies) {
        if (!(packageName in packageDependencies)) {
            warnIfDifferent(`dependency ${packageName}`, denoVersion, undefined)
        }
    }
}

export function checkManifestConsistency(denoManifest: Manifest, packageManifest: Manifest) {
    warnIfDifferent('version', denoManifest.version, packageManifest.version)
    warnIfDifferent('license', denoManifest.license, packageManifest.license)
    checkDependencyConsistency(denoManifest, packageManifest)
}

function writeVersion(manifestPath: string, version: [number, number, number]) {
    const versionStr = version.join('.')
    const json = JSON.parse(Deno.readTextFileSync(manifestPath))
    json.version = versionStr
    Deno.writeTextFileSync(manifestPath, JSON.stringify(json, null, 2))
    console.log(`Updated version to ${versionStr} in ${manifestPath}`)
}

function main() {
    const denoManifest = readManifest('deno.json')
    const packageManifest = readManifest('package.json')
    checkManifestConsistency(denoManifest, packageManifest)

    const version = readVersion(denoManifest)
    console.log(`Current version: ${version.join('.')}`)
    version[2]++
    console.log(`New version: ${version.join('.')}`)

    writeVersion('deno.json', version)
    writeVersion('package.json', version)
}

if (import.meta.main) main()