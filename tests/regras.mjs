// Regras do ponto e do cadastro. Node puro: node tests/regras.mjs
import { horas, pmHoras, statusDe, operador, maqDe, montarD, maqDoDia, opDoDia, mesclarPonto, saiPadrao, norm, problemasDados, enrich } from '../src/lib/regras.js'

let ok = 0, tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else { console.log(`  ✗ ${descricao}`); console.log(`     esperado: ${JSON.stringify(esperado)}`); console.log(`     veio:     ${JSON.stringify(real)}`) }
}

// horas: desconta 1h de almoço só quando passa de 6h
conferir('7h às 17h = 9h (com almoço)', horas({ st: 'P', ent: '07:00', sai: '17:00' }), 9)
conferir('7h às 12h = 5h (sem almoço)', horas({ st: 'P', ent: '07:00', sai: '12:00' }), 5)
conferir('falta não tem horas', horas({ st: 'F', ent: '07:00', sai: '17:00' }), null)
conferir('virada de noite: 22h às 6h = 7h', horas({ st: 'P', ent: '22:00', sai: '06:00' }), 7)
conferir('horímetro com vírgula', pmHoras({ hi: '1200,5', hf: '1208' }), 7.5)
conferir('horímetro final menor não conta', pmHoras({ hi: '10', hf: '5' }), null)

// liberação exige os dois
conferir('ASO sem treinamento = pendente', statusDe({ aso: true, trein: false }), 'Pendente')
conferir('ASO + treinamento = liberado', statusDe({ aso: true, trein: true }), 'Liberado')

// cruzamento de nomes com e sem acento
const people = [enrich({ id: 'a', nome: 'Maurício de Castro Silva', obra: 'Terras 6', situacao: 'Ativo' }), enrich({ id: 'b', nome: 'Kleberson Abreu Menezes', obra: 'C', situacao: 'Ativo' }), enrich({ id: 'c', nome: 'Kleberson Abreu Menezes', obra: 'D', situacao: 'Ativo' })]
const machines = [{ id: 'm1', resp: 'Mauricio de Castro Silva', obra: 'Terras 6' }, { id: 'm2', resp: 'Kleberson Abreu', obra: 'C' }]
conferir('acento não atrapalha o nome', operador(machines[0], people)?.id, 'a')
conferir('nome parcial com dois candidatos não escolhe ninguém', operador(machines[1], people), null)
conferir('máquina do cadastro pelo nome', maqDe(people[0], machines), 'm1')
conferir('norm tira acento e pontuação', norm('  José-Maria  Ñ '), 'jose maria n')

// ponto: marcar presente usa o horário e a máquina padrão; falta limpa horário
const pad = { ent: '07:00', sai: '16:00', maq: 'm1' }
conferir('presente pega o padrão', mesclarPonto(undefined, { st: 'P' }, pad), { st: 'P', ent: '07:00', sai: '16:00', maq: 'm1' })
conferir('presente mantém máquina escolhida antes', mesclarPonto({ maq: '' }, { st: 'P' }, pad).maq, '')
conferir('falta limpa entrada e saída', mesclarPonto({ st: 'P', ent: '07:00', sai: '17:00' }, { st: 'F' }, pad), { st: 'F', ent: '', sai: '' })
conferir('sexta usa a saída de sexta', saiPadrao('2026-10-30', '17:00', '16:00'), '16:00')
conferir('quinta usa a saída normal', saiPadrao('2026-10-29', '17:00', '16:00'), '17:00')

// operador do dia: quem o ponto lançou na máquina vence o cadastro
const D = montarD({ people, machines, ponto: { '2026-10-29': { b: { st: 'P', maq: 'm1' } } }, pontoM: {} })
conferir('maquina do dia segue cadastro quando não escolhida', maqDoDia({}, people[0], D), 'm1')
conferir('operador vem do ponto', opDoDia(machines[0], '2026-10-29', D), { id: 'b', origem: 'ponto' })
conferir('operador lançado na máquina vence', opDoDia(machines[0], '2026-10-29', { ...D, pontoM: { '2026-10-29': { m1: { op: '' } } } }), { id: '', origem: 'lançado' })

// qualidade dos dados acusa nomes duplicados
const dq = problemasDados(people, machines, ['Terras 6', 'C', 'D'])
conferir('acusa duplicado', dq.some(x => x[1] === 'Duplicados'), true)
conferir('acusa obra sem máquina', dq.find(x => x[1] === 'Máquinas')?.[3], 'D')

console.log(`${ok}/${tot} — regras`)
process.exit(ok === tot ? 0 : 1)
