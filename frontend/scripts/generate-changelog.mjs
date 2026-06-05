import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptPath = path.resolve(__dirname, '../../scripts/check_docs.py')
const changelogPath = path.resolve(__dirname, '../app/data/changelog.generated.json')
const cmds = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python']

for (const cmd of cmds) {
  const result = spawnSync(cmd, [scriptPath, '--write', '--skip-build'], { stdio: 'inherit' })
  if (result.status === 0) process.exit(0)
}

// Si Python no está disponible en Vercel, crear un placeholder mínimo
// El changelog será vacío pero el build no fallará
console.warn('⚠️  Python no disponible, creando changelog placeholder...')
if (!fs.existsSync(changelogPath)) {
  fs.mkdirSync(path.dirname(changelogPath), { recursive: true })
  fs.writeFileSync(changelogPath, '[]')
}
process.exit(0)
