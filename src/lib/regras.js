// Regras do negócio: puras, sem React e sem banco. É aqui que os testes alcançam.
// "D" é o pacote de dados do momento: { people, machines, ponto, pontoM, maqCad }.

export const PT_ST = [['P','Presente','var(--good)'],['F','Falta','var(--crit)'],['FJ','Falta justificada','#8a5cc7'],['AT','Atestado','var(--warn)'],['FG','Folga','#5b6b7f'],['FE','Férias','var(--series)']]
export const PT_NAME = Object.fromEntries(PT_ST.map(x => [x[0], x[1]]))
export const PM_ST = [['OP','Operando','var(--good)'],['PS','Parada sem serviço','#5b6b7f'],['SO','Sem operador','#8a5cc7'],['QB','Quebrada','var(--crit)'],['MN','Manutenção','var(--warn)'],['CH','Chuva','var(--series)']]
export const PM_NAME = Object.fromEntries(PM_ST.map(x => [x[0], x[1]]))
export const AUSENTE = ['F','FJ','AT','FG','FE']
export const M_SIT = ['Em operação','Em manutenção','Parada','Desmobilizada']
export const SITUACOES = ['Ativo','Desligado']
export const TIPOS_MAQ = ['Máquinas','Equipamentos','Veículos']

export const mSit = x => x.situacao || 'Em operação'
export const pct = (a, b) => b ? Math.round(a / b * 100) : 0
export const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
export const isoOf = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
export const hojeISO = () => isoOf(new Date())
export const dataBR = iso => iso ? iso.split('-').reverse().join('/') : ''
export const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null }

/* horas trabalhadas: saída − entrada, descontando 1h de almoço quando passa de 6h */
export function horas(r) {
  if (!r || r.st !== 'P') return null
  const a = toMin(r.ent), b = toMin(r.sai)
  if (a == null || b == null) return null
  let d = b - a
  if (d < 0) d += 1440
  if (d > 360) d -= 60
  return Math.round(d / 6) / 10
}
/* horas de máquina pelo horímetro (aceita vírgula) */
export function pmHoras(r) {
  if (!r) return null
  const a = parseFloat(String(r.hi || '').replace(',', '.')), b = parseFloat(String(r.hf || '').replace(',', '.'))
  return (isFinite(a) && isFinite(b) && b >= a) ? Math.round((b - a) * 10) / 10 : null
}

export const statusDe = p => (p.aso && p.trein) ? 'Liberado' : 'Pendente'
export const enrich = p => ({ ...p, status: statusDe(p), obraParts: String(p.obra || '').split('+').map(s => s.trim()).filter(Boolean) })

/* responsável da máquina → colaborador (nome igual, ou todas as palavras do responsável no nome e só um candidato) */
export function operador(x, people) {
  const r = norm(x.resp); if (!r) return null
  const exact = people.find(p => norm(p.nome) === r); if (exact) return exact
  const toks = r.split(' ')
  const hits = people.filter(p => { const n = norm(p.nome).split(' '); return toks.every(t => n.includes(t)) })
  return hits.length === 1 ? hits[0] : null
}
/* máquina do cadastro de um colaborador */
export function maqDe(p, machines) {
  const n = norm(p.nome), ns = n.split(' ')
  const x = machines.find(m => norm(m.resp) === n) || machines.find(m => { const r = norm(m.resp).split(' ').filter(Boolean); return r.length && r.every(t => ns.includes(t)) })
  return x ? x.id : ''
}
export function montarD({ people, machines, ponto = {}, pontoM = {} }) {
  const maqCad = new Map(people.map(p => [p.id, maqDe(p, machines)]))
  return { people, machines, ponto, pontoM, maqCad }
}
/* maq undefined = segue o cadastro; '' = nenhuma, escolhido de propósito */
export const maqDoDia = (r, p, D) => (r && r.maq !== undefined) ? r.maq : (D.maqCad.get(p.id) || '')
export const maqLabel = (id, machines) => { const x = machines.find(m => m.id === id); return x ? `${x.placa ? x.placa + ' · ' : ''}${x.item}` : '' }
export const ptObra = (p, date, ponto) => ((ponto[date] || {})[p.id] || {}).obra || p.obra
export const pmObra = (x, date, pontoM) => ((pontoM[date] || {})[x.id] || {}).obra || x.obra || ''

/* operador do dia: lançado na máquina > quem o ponto dos colaboradores ligou a ela > cadastro inicial */
export function opDoDia(x, date, D) {
  const r = (D.pontoM[date] || {})[x.id]
  if (r && r.op !== undefined) return { id: r.op, origem: 'lançado' }
  const pc = D.ponto[date] || {}
  const viaPonto = D.people.find(p => p.situacao !== 'Desligado' && pc[p.id] && pc[p.id].st === 'P' && maqDoDia(pc[p.id], p, D) === x.id)
  if (viaPonto) return { id: viaPonto.id, origem: 'ponto' }
  const cad = D.people.filter(p => p.situacao !== 'Desligado' && D.maqCad.get(p.id) === x.id)
  const mesma = cad.find(p => ptObra(p, date, D.ponto) === pmObra(x, date, D.pontoM)) || cad[0]
  if (mesma) return { id: mesma.id, origem: 'cadastro' }
  return { id: x.resp ? '__cad' : '', origem: 'cadastro' }
}
export function opNome(x, date, D) {
  const o = opDoDia(x, date, D)
  if (o.id === '__cad') return x.resp || ''
  const p = D.people.find(y => y.id === o.id)
  return p ? p.nome : ''
}
export function pmAvisos(x, date, st, D) {
  const o = opDoDia(x, date, D), av = []
  const p = D.people.find(y => y.id === o.id), r = p ? (D.ponto[date] || {})[p.id] : null
  const nome1 = p ? p.nome.split(' ')[0] : ''
  if (p && r && AUSENTE.includes(r.st)) av.push(['', `${nome1} está com ${PT_NAME[r.st].toLowerCase()} — escolha um operador substituto`])
  if (p && r && r.st === 'P' && maqDoDia(r, p, D) && maqDoDia(r, p, D) !== x.id) av.push(['w', `${nome1} foi lançado em outra máquina (${maqLabel(maqDoDia(r, p, D), D.machines)})`])
  if (p && r && r.st === 'P' && ptObra(p, date, D.ponto) !== pmObra(x, date, D.pontoM)) av.push(['w', `${nome1} está na obra ${ptObra(p, date, D.ponto)} hoje`])
  if (['QB', 'MN'].includes(st)) {
    const sem = D.people.filter(y => { const ry = (D.ponto[date] || {})[y.id]; return ry && ry.st === 'P' && maqDoDia(ry, y, D) === x.id })
    if (sem.length) av.push(['', `${sem.map(y => y.nome.split(' ')[0]).join(', ')} ficou sem máquina — remanejar`])
  }
  if (!o.id && st === 'OP') av.push(['', 'Sem operador definido'])
  return av
}
export function pontoResumo(arr, ponto, date) {
  const m = ponto[date] || {}; let p = 0, f = 0, l = 0
  arr.forEach(x => { const r = m[x.id]; if (r && r.st) { l++; if (r.st === 'P') p++; if (r.st === 'F') f++ } })
  return { p, f, l }
}
/* seg–qui usa a saída normal; sexta e fim de semana, a saída menor (sábado de 8h, como no espelho) */
export const saiPadrao = (date, sai, saiSex) => [0, 5, 6].includes(new Date(date + 'T12:00:00').getDay()) ? saiSex : sai

/* junta um lançamento de ponto com a mudança pedida (padrao = { ent, sai, maq } do dia) */
export function mesclarPonto(cur, patch, padrao) {
  const rec = { ...(cur || {}), ...patch }
  if (patch.st === 'P' && !rec.ent && !rec.sai) { rec.ent = padrao.ent; rec.sai = padrao.sai }
  if (patch.st === 'P' && rec.maq === undefined) rec.maq = padrao.maq
  if (patch.st && patch.st !== 'P') { rec.ent = ''; rec.sai = '' }
  return rec
}

/* filtros da barra de cima (F = { obra, sit, status, pend, aloj, alojNome, func, q }) */
export function filtrarPessoas(people, F) {
  const q = F.q.trim().toLowerCase()
  return people.filter(p =>
    (!F.obra || p.obraParts.includes(F.obra)) && (!F.sit || p.situacao === F.sit) && (!F.status || p.status === F.status) &&
    (!F.pend || (F.pend === 'aso' && !p.aso) || (F.pend === 'trein' && !p.trein) || (F.pend === 'adm' && !p.admissao)) &&
    (F.aloj === '' || String(+!!p.alojado) === F.aloj) && (!F.alojNome || (p.alojado && p.alojamento === F.alojNome)) &&
    (!F.func || p.funcao === F.func) && (!q || (p.nome + ' ' + p.funcao).toLowerCase().includes(q)))
}

export const titleCase = s => s.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/ (De|Da|Do|Dos|Das|E) /g, m => m.toLowerCase())
export const countBy = (arr, key) => { const m = {}; arr.forEach(p => { const k = key(p); if (k) m[k] = (m[k] || 0) + 1 }); return Object.entries(m).sort((a, b) => b[1] - a[1]) }

/* inconsistências para a aba Qualidade dos dados: [classe, rótulo, título, detalhe] */
export function problemasDados(people, machines, obrasNomes) {
  const at = people.filter(p => p.situacao !== 'Desligado')
  const nomes = arr => arr.map(p => p.nome).join(', ')
  const items = []
  const semAdm = at.filter(p => !p.admissao); if (semAdm.length) items.push(['p-warn', 'Admissão', `${semAdm.length} sem data de admissão:`, nomes(semAdm)])
  const alojSem = at.filter(p => p.alojado && (!p.alojamento || /a definir|dfdf/i.test(p.alojamento))); if (alojSem.length) items.push(['p-warn', 'Alojamento', `${alojSem.length} alojado(s) com local indefinido ou suspeito:`, nomes(alojSem)])
  const semAso = at.filter(p => !p.aso); if (semAso.length) items.push(['p-crit', 'ASO', `${semAso.length} ativos sem ASO:`, nomes(semAso)])
  const semTr = at.filter(p => p.aso && !p.trein); if (semTr.length) items.push(['p-warn', 'Treinamento', `${semTr.length} com ASO mas sem treinamento:`, nomes(semTr)])
  const dups = countBy(at, p => norm(p.nome)).filter(([, v]) => v > 1)
  if (dups.length) items.push(['p-warn', 'Duplicados', `${dups.length} nome(s) cadastrados mais de uma vez:`,
    dups.map(([k]) => { const g = at.filter(p => norm(p.nome) === k); return `${g[0].nome} (${g.map(p => p.obra).join(' e ')})` }).join(', ') + '. Se a pessoa trabalha numa obra só, desligue ou exclua o cadastro extra; os dois contam no efetivo.'])
  const semOp = machines.filter(x => mSit(x) !== 'Desmobilizada' && x.resp && !operador(x, people) && !/terceiriz/i.test(x.obs || ''))
  if (semOp.length) items.push(['p-warn', 'Operador', `${semOp.length} máquina(s) com responsável que não bate com nenhum colaborador:`,
    semOp.map(x => `${x.placa || x.item} (${x.resp})`).join(', ') + '. Confira a grafia do nome em Máquinas › Editar, ou cadastre o colaborador.'])
  const semMaq = obrasNomes.filter(o => at.some(p => p.obraParts.includes(o)) && !machines.some(x => x.obra === o))
  if (semMaq.length) items.push(['p-warn', 'Máquinas', 'Obras com efetivo e sem máquinas cadastradas:', semMaq.join(', ')])
  return items
}
