import * as fs from 'jsr:@std/fs@1.0.5'
import * as path from 'jsr:@std/path@1.0.7'
import * as enc from 'jsr:@std/encoding@1.0.1'

export function createMemoryAssets(files: {name:string, path:string}[], assetsFile: string, reader?: (f: typeof files[0]) => Uint8Array|null) {
  const assetsLines = files.map(f => `  "${f.name}": "${enc.encodeBase64(reader?.(f) || Deno.readFileSync(f.path))}"`)
  const assetsTs = `export const assets: Record<string, string> = {\n${assetsLines.join(',\n')}\n}\n`
  Deno.writeTextFileSync(assetsFile, assetsTs)
}

export function saveMemoryAssets(assets: Record<string, string>, root: string) {
  if (root !== '.') {
    Deno.mkdirSync(root)
  }
  for (const [name, data] of Object.entries(assets)) {
    const filePath = root + '/' + name
    fs.ensureDirSync(path.dirname(filePath))
    Deno.writeFileSync(filePath, enc.decodeBase64(data))
  }
}
