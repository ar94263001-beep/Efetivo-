// RDO diário. Node puro: node tests/rdo.mjs
import { montarRdoDia, montarRdoMes } from '../src/lib/rdo.js'
import { montarD, enrich } from '../src/lib/regras.js'

let ok = 0, tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else { console.log(`  ✗ ${descricao}`); console.log(`     esperado: ${JSON.stringify(esperado)}`); console.log(`     veio:     ${JSON.stringify(real)}`) }
}
const people = [enrich({ id: 'a', nome: 'Ana Lima', funcao: 'Operador', obra: 'T', situacao: 'Ativo' }), enrich({ id: 'b', nome: 'Beto Reis', funcao: 'Servente', obra: 'T', situacao: 'Ativo' }), enrich({ id: 'c', nome: 'Caio Melo', funcao: 'Motorista', obra: 'T', situacao: 'Ativo' })]
const machines = [{ id: 'm1', item: 'Escavadeira', placa: 'EH-1', resp: 'Ana Lima', obra: 'T', situacao: 'Em operação' }, { id: 'm2', item: 'Pipa', placa: 'CMP-1', resp: 'Caio Melo', obra: 'T', situacao: 'Em operação' }, { id: 'm3', item: 'Rolo', placa: 'R-1', resp: 'Fulano Terceiro', obra: 'T', situacao: 'Em operação' }, { id: 'm4', item: 'Velha', placa: 'V-1', resp: '', obra: 'T', situacao: 'Desmobilizada' }, { id: 'm5', item: 'Outra', placa: 'O-1', resp: '', obra: 'C', situacao: 'Em operação' }]
const dia = '2026-10-01' // quinta
const ponto = { [dia]: { a: { st: 'P', ent: '07:00', sai: '19:00' }, b: { st: 'P', ent: '07:00', sai: '17:00' }, c: { st: 'F' } }, '2026-10-04': { a: { st: 'P', ent: '07:00', sai: '11:00' } } }
const pontoM = { [dia]: { m1: { st: 'OP', hi: '100,5', hf: '108' }, m2: { st: 'QB', obs: 'mangueira' } } }
const D = montarD({ people, machines, ponto, pontoM })
const r = montarRdoDia(dia, 'T', D, [{ data: dia, tipo: 'col', obra: 'T' }])
const por = p => r.linhas.find(l => l.prefixo === p)
conferir('máquinas da obra, sem a desmobilizada e sem a de outra obra', r.linhas.filter(l => l.prefixo).map(l => l.prefixo), ['CMP-1', 'EH-1', 'R-1'])
conferir('horímetro vira número', por('EH-1').hi, 100.5)
conferir('horas pelo horímetro', por('EH-1').horas, 7.5)
conferir('operador presente aparece com horário', [por('EH-1').nome, por('EH-1').entrada, por('EH-1').saida], ['ANA LIMA', '07:00', '19:00'])
conferir('extra de dia comum vai para 60%', por('EH-1').he60, 2)
conferir('operador que faltou não aparece', por('CMP-1').nome, '')
conferir('situação da máquina entra na observação', por('CMP-1').obs, 'QUEBRADA - MANGUEIRA')
conferir('terceirizado fora da lista aparece pelo cadastro', por('R-1').nome, 'FULANO TERCEIRO')
conferir('presente sem máquina entra embaixo', r.linhas[r.linhas.length - 1].nome, 'BETO REIS')
conferir('quem faltou não entra na mão de obra', r.linhas.some(l => l.nome === 'CAIO MELO'), false)
conferir('dia salvo fica validado', r.validada, true)
conferir('dia sem salvar não fica validado', montarRdoDia(dia, 'T', D, []).validada, false)
conferir('extra de domingo vai para 100%', montarRdoDia('2026-10-04', 'T', D, []).linhas.find(l => l.nome === 'ANA LIMA').he100, 4)
conferir('uma folha por dia lançado', montarRdoMes('2026-10', 'T', D, []).map(d => d.n), [1, 4])
conferir('obra sem lançamento não gera folha', montarRdoMes('2026-10', 'C', D, []).length, 0)

console.log(`${ok}/${tot} — rdo`)
process.exit(ok === tot ? 0 : 1)
