import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve('node_modules/payload/dist/auth/strategies/local/generatePasswordSaltHash.js')
let source = readFileSync(file, 'utf8')
const originalPrefix = "const currentPasswordHashPrefix = 'pbkdf2-sha256-v1:';"
const originalIterations = 'const currentPasswordHashIterations = 600000;'
if (source.includes("const currentPasswordHashPrefix = 'pbkdf2-sha256-cf-v1:';")) {
  console.log('Workers password hash compatibility is already applied')
  process.exit(0)
}
if (!source.includes(originalPrefix) || !source.includes(originalIterations)) {
  throw new Error('Unexpected Payload password hash implementation; refusing to patch')
}
source = source.replace(originalPrefix, "const currentPasswordHashPrefix = 'pbkdf2-sha256-cf-v1:';")
source = source.replace(originalIterations, 'const currentPasswordHashIterations = 100000;')
const marker = 'export const getPasswordHashParameters = (hash)=>{'
source = source.replace(marker, marker + `
    const cloudflarePrefix = 'pbkdf2-sha256-cf-v1:';
    if (typeof hash === 'string' && hash.startsWith(cloudflarePrefix)) {
        return { hash: hash.slice(cloudflarePrefix.length), iterations: currentPasswordHashIterations, keyLength: currentPasswordHashKeyLength };
    }`)
source = source.replace(
  'export const isCurrentPasswordHash = (hash)=>typeof hash === \'string\' && hash.startsWith(currentPasswordHashPrefix);',
  "export const isCurrentPasswordHash = (hash)=>typeof hash === 'string' && (hash.startsWith(currentPasswordHashPrefix) || hash.startsWith('pbkdf2-sha256-cf-v1:'));",
)
writeFileSync(file, source)
console.log('Applied Workers-compatible PBKDF2 configuration')
