// Copie para `tests/run.mjs` no projeto.
// Roda todo arquivo .mjs desta pasta, um por um, e falha se algum falhar.
// É o que o `npm run check` chama. Teste novo não precisa ser registrado em
// lugar nenhum: basta existir aqui dentro.
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const pasta = dirname(fileURLToPath(import.meta.url))
const arquivos = readdirSync(pasta)
  .filter((f) => f.endsWith('.mjs') && f !== 'run.mjs')
  .sort()

if (arquivos.length === 0) {
  console.log('Nenhum teste em tests/. Todo bug corrigido em src/lib/ nasce com um.')
  process.exit(0)
}

let falharam = 0
for (const arquivo of arquivos) {
  const r = spawnSync(process.execPath, [join(pasta, arquivo)], { stdio: 'inherit' })
  if (r.status !== 0) {
    falharam++
    console.log(`✗ ${arquivo} falhou`)
  }
}

console.log(`\n${arquivos.length - falharam}/${arquivos.length} arquivos de teste passaram.`)
process.exit(falharam ? 1 : 0)
