// Gera arquivos para baixar: CSV (abre no Excel com acento certo) e o Excel do Power BI.
import { construirPlanilha } from './espelhoXlsx.js'
import { construirRdo } from './rdoXlsx.js'
import { montarRdoMes } from './rdo.js'
import { montarEspelhos, nomeMes, siglaMes } from './espelho.js'
import { PT_NAME, PM_NAME, horas, pmHoras, maqDoDia, maqLabel, opNome, pmObra, mSit, operador } from './regras.js'

const BOM = '﻿'
const cel = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'

export function baixar(nome, conteudo, tipo) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = nome
  document.body.appendChild(a); a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1500)
}
export const baixarCsv = (nome, linhas) => baixar(nome, BOM + linhas.map(l => l.map(cel).join(';')).join('\r\n'), 'text/csv;charset=utf-8')

const diaSemana = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
const br = d => d.split('-').reverse().join('/')
const virgula = n => (n ?? '').toString().replace('.', ',')

/* linhas do ponto dos colaboradores; pessoasDoDia(d) devolve quem entra no arquivo naquele dia */
export function linhasPonto(dias, pessoasDoDia, D) {
  const out = [['Data', 'Dia da semana', 'Colaborador', 'Funcao', 'Obra no dia', 'Obra no cadastro', 'Lancamento', 'Entrada', 'Saida', 'Horas', 'Maquina', 'Observacao']]
  dias.forEach(d => pessoasDoDia(d).forEach(p => {
    const r = (D.ponto[d] || {})[p.id]
    if (r && r.st) out.push([br(d), diaSemana(d), p.nome, p.funcao, r.obra || p.obra, p.obra, PT_NAME[r.st] || r.st, r.ent || '', r.sai || '', virgula(horas(r)), maqLabel(maqDoDia(r, p, D), D.machines), r.obs || ''])
  }))
  return out
}
export function linhasPontoMaq(dias, maquinasDoDia, D) {
  const out = [['Data', 'Dia da semana', 'Prefixo', 'Maquina', 'Obra no dia', 'Obra no cadastro', 'Situacao', 'Operador do dia', 'Operador no cadastro', 'Horimetro inicial', 'Horimetro final', 'Horas maquina', 'Observacao']]
  dias.forEach(d => maquinasDoDia(d).forEach(x => {
    const r = (D.pontoM[d] || {})[x.id]
    if (r && r.st) out.push([br(d), diaSemana(d), x.placa || '', x.item, pmObra(x, d, D.pontoM), x.obra || '', PM_NAME[r.st] || r.st, opNome(x, d, D), x.resp || '', r.hi || '', r.hf || '', virgula(pmHoras(r)), r.obs || ''])
  }))
  return out
}
export const linhasColaboradores = people => [['ID', 'Colaborador', 'Funcao', 'Obra', 'Situacao', 'Admissao', 'ASO_OK', 'Treinamento_OK', 'Status', 'Alojado', 'Alojamento', 'Observacoes'],
  ...people.map(p => [p.seq, p.nome, p.funcao, p.obra, p.situacao, p.admissao || '', p.aso ? 'SIM' : 'NÃO', p.trein ? 'SIM' : 'NÃO', p.status, p.alojado ? 'SIM' : 'NÃO', p.alojado ? p.alojamento : 'Não alojado', p.obs])]
export const linhasMaquinas = machines => [['Item', 'Tipo', 'Situacao', 'Obra', 'Responsavel', 'Placa', 'Ano', 'Observacoes'],
  ...machines.map(x => [x.item, x.tipo, mSit(x), x.obra, x.resp, x.placa, x.ano, x.obs])]

/* SheetJS só é baixado quando alguém pede o Excel (não pesa no app) */
function carregarXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX)
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('Não foi possível baixar o gerador de Excel. Verifique a internet.'))
    document.head.appendChild(s)
  })
}
function carregarExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS)
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
    s.onload = () => res(window.ExcelJS); s.onerror = () => rej(new Error('Não foi possível baixar o gerador de Excel. Verifique a internet.'))
    document.head.appendChild(s)
  })
}
/* Espelho de ponto do mês, no modelo da planilha: uma aba por obra. Devolve quantas abas gerou. */
export async function exportarEspelho(mes, obras, D) {
  const espelhos = montarEspelhos(mes, obras, D)
  if (!espelhos.length) return 0
  const ExcelJS = await carregarExcelJS()
  const logo = await fetch('/logo-espelho.png').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null)
  const wb = construirPlanilha(ExcelJS, espelhos, siglaMes(mes), logo)
  const buf = await wb.xlsx.writeBuffer()
  const sufixo = obras.length === 1 ? obras[0].toUpperCase().replace(/\s+/g, '_') : 'TODAS_AS_OBRAS'
  baixar(`Espelho_de_Pontos_${nomeMes(mes).replace(' ', '_')}_${sufixo}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  return espelhos.length
}
/* RDO do mês de uma obra: uma aba por dia lançado. Devolve quantas abas gerou. */
export async function exportarRdo(mes, obra, D, salvos) {
  const dias = montarRdoMes(mes, obra, D, salvos)
  if (!dias.length) return 0
  const ExcelJS = await carregarExcelJS()
  const logo = await fetch('/logo-espelho.png').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null)
  const wb = construirRdo(ExcelJS, dias, nomeMes(mes), logo)
  const buf = await wb.xlsx.writeBuffer()
  baixar(`RDO_${nomeMes(mes).replace(' ', '_')}_${obra.toUpperCase().replace(/\s+/g, '_')}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  return dias.length
}
export async function exportarPowerBI(D) {
  const XLSX = await carregarXlsx()
  const yn = v => v ? 'SIM' : 'NÃO'
  const colab = D.people.map(p => ({ ID: p.id, Seq: +p.seq || null, Colaborador: p.nome, Funcao: p.funcao, Obra: p.obra, Situacao: p.situacao || 'Ativo',
    Admissao: p.admissao ? new Date(p.admissao + 'T12:00:00') : null, ASO_OK: yn(p.aso), Treinamento_OK: yn(p.trein), Status: p.status,
    Alojado: yn(p.alojado), Alojamento: p.alojado ? (p.alojamento || 'A definir') : 'Não alojado', Observacoes: p.obs || '', Atualizado_Em: p.atualizadoEm || '' }))
  const maq = D.machines.map(x => { const op = operador(x, D.people); return { ID: x.id, Item: x.item, Tipo: x.tipo || '', Situacao: mSit(x), Obra: x.obra || '', Responsavel: x.resp || '',
    Operador_Encontrado: op ? op.nome : '', Placa: x.placa || '', Ano: x.ano || null, Observacoes: x.obs || '' } })
  const par = Object.entries(D.ponto).flatMap(([d, m]) => Object.entries(m).filter(([, r]) => r && r.st).map(([id, r]) => { const p = D.people.find(x => x.id === id)
    return { Data: d, ID: id, Colaborador: p ? p.nome : id, Obra: r.obra || (p ? p.obra : ''), Lancamento: r.st, Entrada: r.ent || '', Saida: r.sai || '', Horas: horas(r) ?? '', Maquina: p ? maqLabel(maqDoDia(r, p, D), D.machines) : '', Observacao: r.obs || '' } }))
  const pmq = Object.entries(D.pontoM).flatMap(([d, m]) => Object.entries(m).filter(([, r]) => r && r.st).map(([id, r]) => { const x = D.machines.find(y => y.id === id) || { id, item: id }
    return { Data: d, Prefixo: x.placa || '', Maquina: x.item, Obra: pmObra(x, d, D.pontoM), Situacao: PM_NAME[r.st] || r.st, Operador: opNome(x, d, D), Horimetro_Ini: r.hi || '', Horimetro_Fim: r.hf || '', Horas: pmHoras(r) ?? '', Observacao: r.obs || '' } }))
  const vazio = cols => [Object.fromEntries(cols.map(c => [c, '']))]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(colab, { cellDates: true }), 'fColaboradores')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(maq), 'fMaquinas')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(par.length ? par : vazio(['Data', 'ID', 'Colaborador', 'Obra', 'Lancamento', 'Entrada', 'Saida', 'Horas', 'Maquina', 'Observacao'])), 'fPonto')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pmq.length ? pmq : vazio(['Data', 'Prefixo', 'Maquina', 'Obra', 'Situacao', 'Operador', 'Horimetro_Ini', 'Horimetro_Fim', 'Horas', 'Observacao'])), 'fPontoMaquinas')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Exportado_Em: new Date(), Colaboradores: colab.length, Maquinas: maq.length }], { cellDates: true }), 'Info')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  baixar('Efetivo_PowerBI.xlsx', new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
}
