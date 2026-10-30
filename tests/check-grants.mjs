// Copie para `tests/check-grants.mjs`. Só faz sentido em projeto com Supabase.
//
// O que faz: lê os arquivos de `supabase/migrations/` e confere, para toda
// tabela criada no schema public:
//   1. que a RLS foi ligada (`enable row level security`);
//   2. que existe a liberação escrita para quem está logado
//      (`grant ... on <tabela> to authenticated`).
// E recusa dois atalhos perigosos: `grant all` e liberação para `anon`
// (quem não fez login) sem a palavra `publico-de-proposito` no mesmo arquivo.
//
// Por que existe: desde 30/05/2026 (projeto novo do Supabase) e 30/10/2026
// (todos), tabela nova não é mais liberada sozinha para o app. Sem o GRANT o
// app recebe "permission denied for table (42501)". O agente que vê esse erro
// tende a "consertar" com GRANT ALL, que abre a tabela para quem não fez login.
//
// É estático: não precisa de internet nem de chave.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PASTA = path.join(__dirname, '..', 'supabase', 'migrations')

if (!fs.existsSync(PASTA)) {
  console.log('check-grants: sem supabase/migrations/ ainda. Nada a conferir.')
  process.exit(0)
}

const arquivos = fs.readdirSync(PASTA).filter((f) => f.endsWith('.sql')).sort()
const textos = arquivos.map((f) => ({ f, sql: fs.readFileSync(path.join(PASTA, f), 'utf8') }))
// tira comentários de linha para não contar exemplo comentado
const limpo = (s) => s.replace(/--[^\n]*/g, '')
const tudo = textos.map((t) => limpo(t.sql)).join('\n').toLowerCase()

const nome = (n) => n.replace(/^public\./, '').replace(/"/g, '')
const tabelas = new Set()
for (const m of tudo.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?((?:public\.)?"?[a-z_0-9]+"?)/g)) {
  if (m[1].includes('.') && !m[1].startsWith('public.')) continue
  tabelas.add(nome(m[1]))
}
const apagadas = new Set([...tudo.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?((?:public\.)?[a-z_0-9]+)/g)].map((m) => nome(m[1])))

const problemas = []
for (const t of tabelas) {
  if (apagadas.has(t)) continue
  const alvo = `(?:public\\.)?"?${t}"?`
  if (!new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?${alvo}\\s+enable\\s+row\\s+level\\s+security`).test(tudo)) {
    problemas.push(`[RLS] a tabela ${t} não liga a RLS em nenhuma migration`)
  }
  if (!new RegExp(`grant\\s+[^;]*\\son\\s+(?:table\\s+)?${alvo}\\s+to\\s+[^;]*authenticated`).test(tudo)) {
    problemas.push(`[GRANT] a tabela ${t} não tem "grant ... to authenticated": o app vai receber 42501`)
  }
}
for (const { f, sql } of textos) {
  const s = limpo(sql).toLowerCase()
  if (/grant\s+all\b/.test(s)) problemas.push(`[GRANT ALL] ${f}: use só os comandos que o app usa (select, insert, update, delete)`)
  if (/grant\s+[^;]*\bto\s+[^;]*\banon\b/.test(s) && !sql.includes('publico-de-proposito')) {
    problemas.push(`[ANON] ${f}: libera tabela para quem não fez login. Se é de propósito, escreva "-- publico-de-proposito" no arquivo`)
  }
}

if (problemas.length) {
  console.log('✗ check-grants:')
  for (const p of problemas) console.log('  ' + p)
  process.exit(1)
}
console.log(`✓ check-grants: ${tabelas.size} tabela(s) com RLS e liberação certa`)
