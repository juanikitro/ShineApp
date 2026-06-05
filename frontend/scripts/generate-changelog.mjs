import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptPath = path.resolve(__dirname, '../../scripts/check_docs.py')
const cmds = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python']

for (const cmd of cmds) {
  const result = spawnSync(cmd, [scriptPath, '--write', '--skip-build'], { stdio: 'inherit' })
  if (result.status === 0) process.exit(0)
}
console.error('Error: no se encontro interprete Python')
process.exit(1)
