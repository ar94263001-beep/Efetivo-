// Espelho de ponto e histórico. Node puro: node tests/espelho.mjs
import { celulaEspelho, horasExtras, jornada, montarEspelho, estadoSalvo, resumoDias, diasDoMes, nomeMes } from '../src/lib/espelho.js'
import { montarD, enrich, horas, saiPadrao } from '../src/lib/regras.js'

let ok = 0, tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else { console.log(`  ✗ ${descricao}`); console.log(`     esperado: ${JSON.stringify(esperado)}`); console.log(`     veio:     ${JSON.stringify(real)}`) }
}
// 2026-10-01 quinta, 02 sexta, 03 sábado, 04 domingo
conferir('jornada quinta 9h', jornada('2026-10-01'), 9)
conferir('jornada sexta 8h', jornada('2026-10-02'), 8)
conferir('sábado é todo extra', jornada('2026-10-03'), 0)
const dia = (ent, sai) => ({ st: 'P', ent, sai })
conferir('quinta normal não tem extra', horasExtras(dia('07:00', '17:00'), '2026-10-01'), 0)
conferir('quinta até 19h: 2h extras', horasExtras(dia('07:00', '19:00'), '2026-10-01'), 2)
conferir('sábado de 8h vira 8 extras', horasExtras(dia('07:00', '16:00'), '2026-10-03'), 8)
conferir('saída padrão no sábado é a menor', saiPadrao('2026-10-03', '17:00', '16:00'), '16:00')
conferir('presente normal vira P', celulaEspelho(dia('07:00', '17:00'), '2026-10-01', 'T', 'T'), 'P')
conferir('sábado vira número', celulaEspelho(dia('07:00', '16:00'), '2026-10-03', 'T', 'T'), 8)
conferir('atestado vira A', celulaEspelho({ st: 'AT' }, '2026-10-01', 'T', 'T'), 'A')
conferir('folga vira FOLGA', celulaEspelho({ st: 'FG' }, '2026-10-01', 'T', 'T'), 'FOLGA')
conferir('em outra obra vira OB', celulaEspelho({ st: 'P', obra: 'C' }, '2026-10-01', 'T', 'T'), 'OB')
conferir('código da planilha passa direto', celulaEspelho({ st: 'NT' }, '2026-10-01', 'T', 'T'), 'NT')
conferir('sem lançamento fica vazio', celulaEspelho(undefined, '2026-10-01', 'T', 'T'), '')
conferir('outubro tem 31 dias', diasDoMes('2026-10').length, 31)
conferir('domingo paga 110%', diasDoMes('2026-10')[3].pct, 1.1)
conferir('sábado paga 60%', diasDoMes('2026-10')[2].pct, 0.6)
conferir('nome do mês', nomeMes('2026-09'), 'SETEMBRO 2026')

const people = [enrich({ id: 'a', nome: 'Ana', funcao: 'Servente', obra: 'T', situacao: 'Ativo' }), enrich({ id: 'b', nome: 'Beto', funcao: 'Pedreiro', obra: 'C', situacao: 'Ativo' }), enrich({ id: 'c', nome: 'Caio', funcao: 'x', obra: 'T', situacao: 'Desligado' })]
const ponto = { '2026-10-01': { a: dia('07:00', '17:00'), b: { st: 'P', ent: '07:00', sai: '17:00', obra: 'T' } }, '2026-10-02': { a: { st: 'F' } }, '2026-10-03': { a: dia('07:00', '16:00') }, '2026-10-04': { a: dia('07:00', '11:00') }, '2026-10-05': { a: { st: 'AT' } } }
const D = montarD({ people, machines: [], ponto })
const e = montarEspelho('2026-10', 'T', D)
conferir('entra quem é da obra e quem trabalhou nela; desligado não', e.linhas.map(l => l.nome), ['ANA', 'BETO'])
conferir('horas 60% somam os números fora do domingo', e.linhas[0].h60, 8)
conferir('horas 110% somam o domingo', e.linhas[0].h110, 4)
conferir('conta faltas', e.linhas[0].faltas, 1)
conferir('conta atestados', e.linhas[0].atestados, 1)
conferir('pessoa de fora aparece na obra em que trabalhou', e.linhas[1].celulas[0], 'P')
conferir('na obra do cadastro aparece OB', montarEspelho('2026-10', 'C', D).linhas[0].celulas[0], 'OB')

const salvos = [{ data: '2026-10-01', tipo: 'col', obra: 'T' }]
conferir('dia salvo em todas', estadoSalvo(salvos, '2026-10-01', 'col', ['T']), 'salvo')
conferir('dia salvo em parte', estadoSalvo(salvos, '2026-10-01', 'col', ['T', 'C']), 'parcial')
conferir('folha de máquinas é separada', estadoSalvo(salvos, '2026-10-01', 'maq', ['T']), 'nao')
const r = resumoDias({ mes: '2026-10', tipo: 'col', src: ponto, salvos, obras: ['T'], hoje: '2026-10-02', listaDoDia: () => people.slice(0, 2), horasDe: horas, extrasDe: horasExtras })
conferir('resumo conta presentes do dia', r[0].cont.P, 2)
conferir('resumo conta sem lançamento', r[1].sem, 1)
conferir('dia depois de hoje é futuro', r[2].futuro, true)
conferir('resumo soma horas', r[0].horas, 18)

console.log(`${ok}/${tot} — espelho`)
process.exit(ok === tot ? 0 : 1)
