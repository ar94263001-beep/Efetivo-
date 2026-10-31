// Espelho de ponto e histórico do mês: regra pura, sem React e sem banco.
import { isoOf, horas, ptObra } from './regras.js'

const SIGLA_MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const NOME_MES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']
// código do app → código da planilha
const CODIGO = { F: 'F', AT: 'A', FG: 'FOLGA', FJ: 'FJ', FE: 'FE' }

export function diasDoMes(mes) {
  const [Y, M] = mes.split('-').map(Number), N = new Date(Y, M, 0).getDate()
  return Array.from({ length: N }, (_, i) => {
    const d = new Date(Y, M - 1, i + 1), ds = d.getDay()
    return { n: i + 1, iso: isoOf(d), ds, wk: ds === 0 || ds === 6, dow: 'DSTQQSS'[ds], pct: ds === 0 ? 1.1 : 0.6 }
  })
}
export const nomeMes = mes => `${NOME_MES[+mes.slice(5) - 1]} ${mes.slice(0, 4)}`
export const siglaMes = mes => `${SIGLA_MES[+mes.slice(5) - 1]} ${mes.slice(0, 4)}`

/* jornada normal: seg–qui 9h, sexta 8h; sábado e domingo tudo é extra */
export function jornada(iso) {
  const ds = new Date(iso + 'T12:00:00').getDay()
  return ds === 0 || ds === 6 ? 0 : ds === 5 ? 8 : 9
}
export function horasExtras(r, iso) {
  const h = horas(r)
  if (h == null) return 0
  return Math.max(0, Math.round((h - jornada(iso)) * 10) / 10)
}
/* o que vai na célula do dia: 'P', número de horas extras (como na planilha), código, ou vazio */
export function celulaEspelho(r, iso, obraCadastro, obra) {
  if (!r || !r.st) return ''
  if ((r.obra || obraCadastro) !== obra) return 'OB'
  if (r.st !== 'P') return CODIGO[r.st] || r.st
  return horasExtras(r, iso) || 'P'
}

/* uma folha: quem tem a obra no cadastro (ativo) ou trabalhou nela no mês */
export function montarEspelho(mes, obra, D) {
  const dias = diasDoMes(mes)
  const pessoas = D.people.filter(p =>
    (p.obra === obra && p.situacao !== 'Desligado') ||
    dias.some(d => { const r = (D.ponto[d.iso] || {})[p.id]; return r && r.st && ptObra(p, d.iso, D.ponto) === obra }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const linhas = pessoas.map((p, i) => {
    const celulas = dias.map(d => celulaEspelho((D.ponto[d.iso] || {})[p.id], d.iso, p.obra, obra))
    const soma = pct => dias.reduce((t, d, j) => t + (d.pct === pct && typeof celulas[j] === 'number' ? celulas[j] : 0), 0)
    const obs = dias.map(d => { const r = (D.ponto[d.iso] || {})[p.id]; return r && r.obs ? `${d.n}: ${r.obs}` : '' }).filter(Boolean).join('; ')
    return { n: i + 1, nome: p.nome.toUpperCase(), funcao: (p.funcao || '').toUpperCase(), alojamento: p.alojado ? p.alojamento : '', celulas,
      h60: soma(0.6), h110: soma(1.1), atestados: celulas.filter(c => c === 'A').length, faltas: celulas.filter(c => c === 'F').length, obs }
  })
  return { mes, obra, dias, linhas, titulo: nomeMes(mes) }
}
/* obras que entram no arquivo: a escolhida, ou todas as que têm gente no mês */
export function montarEspelhos(mes, obras, D) {
  return obras.map(o => montarEspelho(mes, o, D)).filter(e => e.linhas.length)
}

export const estadoSalvo = (salvos, iso, tipo, obras) => {
  const feitas = obras.filter(o => salvos.some(s => s.data === iso && s.tipo === tipo && s.obra === o))
  return feitas.length === 0 ? 'nao' : feitas.length === obras.length ? 'salvo' : 'parcial'
}

/* uma linha por dia do mês. listaDoDia(iso) = quem deveria ter lançamento; horasDe(rec, iso) = horas do lançamento */
export function resumoDias({ mes, tipo, src, salvos, obras, hoje, listaDoDia, horasDe, extrasDe = () => 0 }) {
  return diasDoMes(mes).map(d => {
    const m = src[d.iso] || {}, lista = listaDoDia(d.iso), cont = {}
    let lanc = 0, hs = 0, extras = 0
    lista.forEach(x => { const r = m[x.id]; if (r && r.st) { cont[r.st] = (cont[r.st] || 0) + 1; lanc++; hs += horasDe(r, d.iso) || 0; extras += extrasDe(r, d.iso) } })
    return { ...d, cont, lanc, previsto: lista.length, sem: lista.length - lanc, horas: Math.round(hs * 10) / 10, extras: Math.round(extras * 10) / 10,
      futuro: d.iso > hoje, salvo: estadoSalvo(salvos, d.iso, tipo, obras) }
  })
}
