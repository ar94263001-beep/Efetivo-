// CAMADA DE DADOS: a única porta de entrada do banco. Nenhuma tela chama o Supabase direto.
// Toda função devolve { data, erro }. As telas trabalham com o formato "do app":
//   colaborador { id, nome, funcao, obra (nome), situacao, admissao, dias, aso, trein, alojado, alojamento, obs, seq }
//   maquina     { id, item, tipo, obra (nome), resp, situacao, placa, ano, obs, seq }
//   ponto[data][colaboradorId]  = { st, ent, sai, obra, obs, maq }   (maq ausente = segue o cadastro; '' = nenhuma)
//   pontoM[data][maquinaId]     = { st, obra, hi, hf, obs, op }      (op ausente = automático; '' = nenhum; '__cad' = nome do cadastro)
import { supabase } from './supabase.js'
import { MOCK } from './mockData.js'

// Liga o modo de teste quando não há chaves do Supabase (.env.local / Vercel).
export const USAR_MOCK = !supabase
// Sem login por enquanto: quem tem o link usa (decisão de 30/10/2026). Para ligar o login, ver a migration.
export const ACESSO_LIVRE = true

const ok = data => ({ data, erro: null })
function traduzir(e) {
  const m = (e && (e.message || e.error_description)) || String(e)
  if ((e && e.code === '42501') || /permission denied|row-level security/i.test(m)) return 'Sem permissão para isso. Seu login precisa estar aprovado.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sem conexão com a internet. Tente de novo.'
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(m)) return 'Confirme o e-mail primeiro: abra o link que chegou na sua caixa de entrada.'
  if (/User already registered/i.test(m)) return 'Esse e-mail já tem cadastro. Use Entrar.'
  if (/Password should be/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (/duplicate key/i.test(m)) return 'Já existe um registro igual.'
  return m
}
const falha = e => ({ data: null, erro: traduzir(e) })
async function q(promise) { const { data, error } = await promise; return error ? falha(error) : ok(data) }
// Busca tudo em páginas de 1000 (limite do Supabase por consulta).
async function todas(montar) {
  const out = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await montar().range(de, de + 999)
    if (error) return falha(error)
    out.push(...data)
    if (data.length < 1000) return ok(out)
  }
}
const intervaloMes = mes => { const [y, m] = mes.split('-').map(Number); const fim = new Date(y, m, 0).getDate(); return [`${mes}-01`, `${mes}-${String(fim).padStart(2, '0')}`] }

/* ======================= modo de teste (sem banco) ======================= */
const KEY = 'efetivo-mock-v1'
let M = null
function mock() {
  if (M) return M
  try { M = JSON.parse(localStorage.getItem(KEY) || 'null') } catch (_) { M = null }
  if (!M) {
    const nomes = [...new Set([...Object.values(MOCK.colaboradores).map(c => c.obra), ...Object.values(MOCK.maquinas).map(m => m.obra)])]
    M = { obras: nomes.map((nome, i) => ({ id: 'o' + (i + 1), nome, ativa: true })), colaboradores: MOCK.colaboradores, maquinas: MOCK.maquinas, ponto: {}, pontoM: {}, salvos: [],
      usuarios: [{ id: 'u1', nome: 'Você (modo de teste)', email: 'teste@exemplo.com', aprovado: true }, { id: 'u2', nome: 'Encarregado de exemplo', email: 'encarregado@exemplo.com', aprovado: false }] }
  }
  return M
}
const gravar = () => { try { localStorage.setItem(KEY, JSON.stringify(M)) } catch (_) { /* sem armazenamento: segue só na memória */ } }
const novoId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const lista = obj => Object.entries(obj).map(([id, d]) => ({ id, ...d }))
const naoEm = (o, k) => { const r = { ...o }; delete r[k]; return r }

/* ======================= banco (Supabase) ======================= */
let OBRAS = []
const nomeObra = id => (OBRAS.find(o => o.id === id) || {}).nome || ''
async function obraId(nome) {
  if (!nome) return { data: null, erro: null }
  const achou = OBRAS.find(o => o.nome === nome)
  if (achou) return ok(achou.id)
  const r = await q(supabase.from('obras').insert({ nome }).select().single())
  if (r.erro) return r
  OBRAS.push(r.data)
  return ok(r.data.id)
}
const deColab = r => ({ id: r.id, nome: r.nome, funcao: r.funcao, obra: nomeObra(r.obra_id), situacao: r.situacao, admissao: r.admissao, dias: r.dias,
  aso: r.aso, trein: r.treinamento, alojado: r.alojado, alojamento: r.alojamento || '', obs: r.obs || '', seq: r.seq, atualizadoEm: r.updated_at })
const deMaq = r => ({ id: r.id, item: r.item, tipo: r.tipo, obra: nomeObra(r.obra_id), resp: r.responsavel || '', situacao: r.situacao, placa: r.placa || '', ano: r.ano || '', obs: r.obs || '', seq: r.seq })
function dePonto(r) {
  const rec = { st: r.st || '', ent: r.entrada || '', sai: r.saida || '', obra: r.obra_id ? nomeObra(r.obra_id) : '', obs: r.obs || '' }
  if (r.maquina_definida) rec.maq = r.maquina_id || ''
  return rec
}
function dePontoM(r) {
  const rec = { st: r.st || '', obra: r.obra_id ? nomeObra(r.obra_id) : '', hi: r.horimetro_ini || '', hf: r.horimetro_fim || '', obs: r.obs || '' }
  if (r.operador_modo === 'nenhum') rec.op = ''
  else if (r.operador_modo === 'cadastro') rec.op = '__cad'
  else if (r.operador_modo === 'colaborador') rec.op = r.operador_id
  return rec
}
const agrupar = (rows, chave, conv) => { const out = {}; rows.forEach(r => { (out[r.data] = out[r.data] || {})[r[chave]] = conv(r) }); return out }

/* ======================= funções usadas pelas telas ======================= */

export async function carregarCadastros() {
  if (USAR_MOCK) {
    const m = mock()
    return ok({ obras: m.obras, colaboradores: lista(m.colaboradores), maquinas: lista(m.maquinas) })
  }
  const o = await q(supabase.from('obras').select('*').order('nome'))
  if (o.erro) return o
  OBRAS = o.data
  const c = await todas(() => supabase.from('colaboradores').select('*').order('seq'))
  if (c.erro) return c
  const mq = await todas(() => supabase.from('maquinas').select('*').order('seq'))
  if (mq.erro) return mq
  return ok({ obras: OBRAS, colaboradores: c.data.map(deColab), maquinas: mq.data.map(deMaq) })
}

/* ponto de um mês ('2026-10'), ou de todos os meses quando mes = null */
export async function carregarPonto(mes) {
  if (USAR_MOCK) {
    const m = mock(), so = obj => mes ? Object.fromEntries(Object.entries(obj).filter(([d]) => d.startsWith(mes))) : obj
    return ok({ ponto: so(m.ponto), pontoM: so(m.pontoM), salvos: (m.salvos || []).filter(x => !mes || x.data.startsWith(mes)) })
  }
  const [de, ate] = mes ? intervaloMes(mes) : ['1900-01-01', '2999-12-31']
  const p = await todas(() => supabase.from('ponto').select('*').gte('data', de).lte('data', ate).order('data').order('id'))
  if (p.erro) return p
  const pm = await todas(() => supabase.from('ponto_maquinas').select('*').gte('data', de).lte('data', ate).order('data').order('id'))
  if (pm.erro) return pm
  const sv = await todas(() => supabase.from('dias_salvos').select('*').gte('data', de).lte('data', ate).order('data').order('id'))
  if (sv.erro) return sv
  const salvos = sv.data.map(r => ({ data: r.data, tipo: r.tipo, obra: nomeObra(r.obra_id), salvoEm: r.salvo_em }))
  return ok({ ponto: agrupar(p.data, 'colaborador_id', dePonto), pontoM: agrupar(pm.data, 'maquina_id', dePontoM), salvos })
}

export async function salvarColaborador(c) {
  if (USAR_MOCK) {
    const m = mock(), id = c.id || novoId('c')
    m.colaboradores[id] = { ...m.colaboradores[id], ...naoEm(c, 'id'), atualizadoEm: new Date().toISOString() }
    if (c.obra && !m.obras.some(o => o.nome === c.obra)) m.obras.push({ id: novoId('o'), nome: c.obra, ativa: true })
    gravar(); return ok({ id, ...m.colaboradores[id] })
  }
  const linha = {}
  if ('obra' in c) { const o = await obraId(c.obra); if (o.erro) return o; linha.obra_id = o.data }
  const mapa = { nome: 'nome', funcao: 'funcao', situacao: 'situacao', admissao: 'admissao', dias: 'dias', aso: 'aso', trein: 'treinamento', alojado: 'alojado', alojamento: 'alojamento', obs: 'obs', seq: 'seq' }
  Object.entries(mapa).forEach(([k, col]) => { if (k in c) linha[col] = c[k] })
  const r = c.id ? await q(supabase.from('colaboradores').update(linha).eq('id', c.id).select().single())
    : await q(supabase.from('colaboradores').insert(linha).select().single())
  return r.erro ? r : ok(deColab(r.data))
}
export async function excluirColaborador(id) {
  if (USAR_MOCK) { delete mock().colaboradores[id]; gravar(); return ok(true) }
  return q(supabase.from('colaboradores').delete().eq('id', id))
}

export async function salvarMaquina(x) {
  if (USAR_MOCK) {
    const m = mock(), id = x.id || novoId('m')
    m.maquinas[id] = { ...m.maquinas[id], ...naoEm(x, 'id') }
    if (x.obra && !m.obras.some(o => o.nome === x.obra)) m.obras.push({ id: novoId('o'), nome: x.obra, ativa: true })
    gravar(); return ok({ id, ...m.maquinas[id] })
  }
  const linha = {}
  if ('obra' in x) { const o = await obraId(x.obra); if (o.erro) return o; linha.obra_id = o.data }
  const mapa = { item: 'item', tipo: 'tipo', resp: 'responsavel', situacao: 'situacao', placa: 'placa', obs: 'obs', seq: 'seq' }
  Object.entries(mapa).forEach(([k, col]) => { if (k in x) linha[col] = x[k] })
  if ('ano' in x) linha.ano = x.ano ? Number(x.ano) : null
  const r = x.id ? await q(supabase.from('maquinas').update(linha).eq('id', x.id).select().single())
    : await q(supabase.from('maquinas').insert(linha).select().single())
  return r.erro ? r : ok(deMaq(r.data))
}
export async function excluirMaquina(id) {
  if (USAR_MOCK) { delete mock().maquinas[id]; gravar(); return ok(true) }
  return q(supabase.from('maquinas').delete().eq('id', id))
}

/* lancamentos = { colaboradorId: rec } de uma data */
export async function salvarPonto(data, lancamentos) {
  if (USAR_MOCK) { const m = mock(); m.ponto[data] = { ...m.ponto[data], ...lancamentos }; gravar(); return ok(true) }
  const linhas = []
  for (const [id, rec] of Object.entries(lancamentos)) {
    const o = await obraId(rec.obra); if (o.erro) return o
    linhas.push({ data, colaborador_id: id, obra_id: o.data, st: rec.st || null, entrada: rec.ent || null, saida: rec.sai || null,
      maquina_id: rec.maq || null, maquina_definida: rec.maq !== undefined, obs: rec.obs || null })
  }
  return q(supabase.from('ponto').upsert(linhas, { onConflict: 'data,colaborador_id' }))
}
/* lancamentos = { maquinaId: rec } de uma data */
export async function salvarPontoMaquinas(data, lancamentos) {
  if (USAR_MOCK) { const m = mock(); m.pontoM[data] = { ...m.pontoM[data], ...lancamentos }; gravar(); return ok(true) }
  const linhas = []
  for (const [id, rec] of Object.entries(lancamentos)) {
    const o = await obraId(rec.obra); if (o.erro) return o
    const modo = rec.op === undefined ? 'auto' : rec.op === '' ? 'nenhum' : rec.op === '__cad' ? 'cadastro' : 'colaborador'
    linhas.push({ data, maquina_id: id, obra_id: o.data, st: rec.st || null, operador_modo: modo, operador_id: modo === 'colaborador' ? rec.op : null,
      horimetro_ini: rec.hi || null, horimetro_fim: rec.hf || null, obs: rec.obs || null })
  }
  return q(supabase.from('ponto_maquinas').upsert(linhas, { onConflict: 'data,maquina_id' }))
}

/* marca o dia como salvo nas obras indicadas. tipo: 'col' (colaboradores) ou 'maq' (máquinas) */
export async function salvarDia(data, tipo, obras) {
  const salvoEm = new Date().toISOString()
  if (USAR_MOCK) {
    const m = mock()
    m.salvos = [...(m.salvos || []).filter(x => !(x.data === data && x.tipo === tipo && obras.includes(x.obra))), ...obras.map(obra => ({ data, tipo, obra, salvoEm }))]
    gravar(); return ok(true)
  }
  const linhas = []
  for (const nome of obras) {
    const o = await obraId(nome); if (o.erro) return o
    linhas.push({ data, tipo, obra_id: o.data, salvo_em: salvoEm })
  }
  return q(supabase.from('dias_salvos').upsert(linhas, { onConflict: 'data,tipo,obra_id' }))
}

export async function salvarObra(o) {
  if (USAR_MOCK) {
    const m = mock()
    if (o.id) m.obras = m.obras.map(x => x.id === o.id ? { ...x, ...o } : x)
    else m.obras.push({ id: novoId('o'), ativa: true, ...o })
    gravar(); return ok(true)
  }
  const r = o.id ? await q(supabase.from('obras').update({ nome: o.nome, ativa: o.ativa }).eq('id', o.id).select().single())
    : await q(supabase.from('obras').insert({ nome: o.nome }).select().single())
  if (!r.erro) OBRAS = [...OBRAS.filter(x => x.id !== r.data.id), r.data]
  return r
}

/* ======================= login e equipe ======================= */
const PERFIL_TESTE = { id: 'u1', nome: 'Acesso livre', email: '', aprovado: true }
const SEM_LOGIN = USAR_MOCK || ACESSO_LIVRE

export async function sessaoAtual() {
  if (SEM_LOGIN) return ok({ user: { id: 'u1', email: PERFIL_TESTE.email } })
  const { data, error } = await supabase.auth.getSession()
  return error ? falha(error) : ok(data.session)
}
export function ouvirSessao(cb) {
  if (SEM_LOGIN) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s))
  return () => data.subscription.unsubscribe()
}
export async function entrar(email, senha) {
  if (USAR_MOCK) return ok(true)
  return q(supabase.auth.signInWithPassword({ email, password: senha }))
}
export async function cadastrar(nome, email, senha) {
  if (USAR_MOCK) return ok(true)
  return q(supabase.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: location.origin } }))
}
export async function sair() {
  if (USAR_MOCK) return ok(true)
  return q(supabase.auth.signOut())
}
export async function meuPerfil(id) {
  if (SEM_LOGIN) return ok(PERFIL_TESTE)
  return q(supabase.from('profiles').select('id, nome, email, aprovado').eq('id', id).maybeSingle())
}
export async function listarUsuarios() {
  if (USAR_MOCK) return ok(mock().usuarios)
  return q(supabase.from('profiles').select('id, nome, email, aprovado, created_at').order('created_at'))
}
export async function aprovarUsuario(id, aprovado) {
  if (USAR_MOCK) { const m = mock(); m.usuarios = m.usuarios.map(u => u.id === id ? { ...u, aprovado } : u); gravar(); return ok(true) }
  return q(supabase.rpc('aprovar_usuario', { usuario: id, valor: aprovado }))
}
