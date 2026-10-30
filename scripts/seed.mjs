// Carrega os dados iniciais (src/lib/mockData.js) no banco. Roda uma vez: node scripts/seed.mjs
// Se já houver colaboradores no banco, para sem gravar nada.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { MOCK } from '../src/lib/mockData.js'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
const exigir = ({ data, error }) => { if (error) { console.error(error.message); process.exit(1) } return data }

const ja = exigir(await db.from('colaboradores').select('id').limit(1))
if (ja.length) { console.log('O banco já tem colaboradores. Nada foi gravado.'); process.exit(0) }

const colabs = Object.values(MOCK.colaboradores), maqs = Object.values(MOCK.maquinas)
const nomes = [...new Set([...colabs.map(c => c.obra), ...maqs.map(m => m.obra)])]
const obras = exigir(await db.from('obras').insert(nomes.map(nome => ({ nome }))).select())
const idObra = Object.fromEntries(obras.map(o => [o.nome, o.id]))

exigir(await db.from('colaboradores').insert(colabs.map(c => ({ obra_id: idObra[c.obra], nome: c.nome, funcao: c.funcao, situacao: c.situacao, admissao: c.admissao, dias: c.dias,
  aso: c.aso, treinamento: c.trein, alojado: c.alojado, alojamento: c.alojamento, obs: c.obs, seq: c.seq }))))
exigir(await db.from('maquinas').insert(maqs.map(m => ({ obra_id: idObra[m.obra], item: m.item, tipo: m.tipo, responsavel: m.resp, situacao: m.situacao, placa: m.placa, ano: m.ano || null, obs: m.obs, seq: m.seq }))))
console.log(`Gravados: ${obras.length} obras, ${colabs.length} colaboradores, ${maqs.length} máquinas.`)
