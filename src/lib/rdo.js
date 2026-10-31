// RDO (Relatório Diário de Obra): regra pura. Uma folha por dia com lançamento, de uma obra.
import { mSit, maqLabel, opDoDia, pmHoras, pmObra, ptObra, PM_NAME } from './regras.js'
import { diasDoMes, estadoSalvo, horasExtras } from './espelho.js'

const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : null }
const alto = s => (s || '').toUpperCase()

/* extras do dia: domingo vai na coluna de 100%, os outros dias na de 60% */
function pessoaRdo(p, r, iso) {
  const he = horasExtras(r, iso), domingo = new Date(iso + 'T12:00:00').getDay() === 0
  return { nome: alto(p.nome), funcao: alto(p.funcao), entrada: r.ent || '', saida: r.sai || '', he60: !domingo && he ? he : null, he100: domingo && he ? he : null }
}

export function montarRdoDia(iso, obra, D, salvos, climas = []) {
  const pc = D.ponto[iso] || {}, pm = D.pontoM[iso] || {}
  const usados = new Set()
  const maquinas = D.machines.filter(x => mSit(x) !== 'Desmobilizada' && pmObra(x, iso, D.pontoM) === obra)
    .sort((a, b) => maqLabel(a.id, D.machines).localeCompare(maqLabel(b.id, D.machines), 'pt-BR', { numeric: true }))
  const linhas = maquinas.map(x => {
    const r = pm[x.id] || {}, o = opDoDia(x, iso, D), p = D.people.find(y => y.id === o.id), rp = p ? pc[p.id] : null
    let op = { nome: '', funcao: '', entrada: '', saida: '', he60: null, he100: null }
    if (p && rp && rp.st === 'P') { op = pessoaRdo(p, rp, iso); usados.add(p.id) }
    else if (o.id === '__cad') op = { ...op, nome: alto(x.resp) } // terceirizado: não está no ponto
    const situacao = r.st && r.st !== 'OP' ? PM_NAME[r.st] : ''
    return { prefixo: x.placa || '', tipo: alto(x.item), hi: num(r.hi), hf: num(r.hf), horas: pmHoras(r), diesel: num(r.diesel), gasolina: num(r.gasolina), parada: num(r.parada), obs: alto([situacao, r.obs].filter(Boolean).join(' - ')), ...op }
  })
  // quem veio e não opera máquina entra embaixo, só na parte da mão de obra
  D.people.filter(p => !usados.has(p.id) && pc[p.id] && pc[p.id].st === 'P' && ptObra(p, iso, D.ponto) === obra)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .forEach(p => linhas.push({ prefixo: '', tipo: '', hi: null, hf: null, horas: null, diesel: null, gasolina: null, parada: null, obs: '', ...pessoaRdo(p, pc[p.id], iso) }))
  const contagem = {}
  linhas.forEach(l => { if (l.nome) contagem[l.nome] = (contagem[l.nome] || 0) + 1 })
  const clima = (climas.find(c => c.data === iso && c.obra === obra) || {}).clima || ''
  return { iso, obra, clima, linhas, repetidos: Object.keys(contagem).filter(k => contagem[k] > 1), validada: estadoSalvo(salvos, iso, 'col', [obra]) === 'salvo' }
}

/* dias do mês que têm algum lançamento nessa obra */
export function montarRdoMes(mes, obra, D, salvos, climas = []) {
  return diasDoMes(mes).filter(d => {
    const pc = D.ponto[d.iso] || {}, pm = D.pontoM[d.iso] || {}
    return D.people.some(p => pc[p.id] && pc[p.id].st && ptObra(p, d.iso, D.ponto) === obra) ||
      D.machines.some(x => pm[x.id] && pm[x.id].st && pmObra(x, d.iso, D.pontoM) === obra)
  }).map(d => ({ ...montarRdoDia(d.iso, obra, D, salvos, climas), n: d.n }))
}
