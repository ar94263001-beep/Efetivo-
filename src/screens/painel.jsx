import { useDados } from '../lib/DadosContext.jsx'
import { PT_ST, hojeISO, dataBR, mSit, pontoResumo, countBy } from '../lib/regras.js'
import { Kpis, HBars, Alerts, barraUnica } from '../components/index.jsx'

export default function Painel({ P, F }) {
  const { people, machines, ponto, pontoM } = useDados()
  const hoje = hojeISO()
  const ativos = P.filter(p => p.situacao !== 'Desligado')
  const lib = ativos.filter(p => p.status === 'Liberado').length
  const ph = pontoResumo(ativos, ponto, hoje)
  const aloj = ativos.filter(p => p.alojado).length
  const maq = machines.filter(m => (!F.obra || m.obra === F.obra) && mSit(m) !== 'Desmobilizada')
  const desl = P.length - ativos.length

  const kpis = [
    ['Efetivo ativo', ativos.length, desl ? `+ ${desl} desligado(s) no filtro` : `de ${people.length} cadastrados`],
    ['Liberados para trabalhar', lib, ativos.length ? `${Math.round(lib / ativos.length * 100)}% · ${ativos.length - lib} pendentes` : '—'],
    ['Presentes hoje', ph.p + ' / ' + ativos.length, ph.l ? `${ph.f} falta(s) · ${ativos.length - ph.l} sem lançamento` : 'Ponto de hoje ainda não lançado'],
    ['Alojados', aloj, `${ativos.length - aloj} não alojados`],
    ['Máquinas e equip.', maq.length, F.obra || 'Todas as obras'],
  ]
  const byObra = [...new Set(ativos.map(p => p.obra))].map(o => {
    const g = ativos.filter(p => p.obra === o), l = g.filter(p => p.status === 'Liberado').length
    return { label: o, total: g.length, text: String(g.length), parts: [{ v: l, color: 'var(--good)', name: 'Liberados' }, { v: g.length - l, color: 'var(--warn)', name: 'Pendentes' }] }
  }).sort((a, b) => b.total - a.total)
  const hj = ponto[hoje] || {}
  const ptRows = PT_ST.map(([k, n, c]) => { const v = ativos.filter(p => hj[p.id] && hj[p.id].st === k).length; return { label: n, total: v, text: String(v), parts: [{ v, color: c, name: n }] } }).filter(r => r.total)
  const semL = ativos.length - ph.l
  if (semL) ptRows.push({ label: 'Sem lançamento', total: semL, text: String(semL), parts: [{ v: semL, color: 'var(--line)', name: 'Sem lançamento' }] })

  const pend = ativos.filter(p => p.status === 'Pendente')
  const aDef = ativos.filter(p => p.alojado && (!p.alojamento || /a definir/i.test(p.alojamento)))
  const hm = Object.values(pontoM[hoje] || {})
  const qb = hm.filter(r => r && ['QB', 'MN'].includes(r.st)).length, so = hm.filter(r => r && r.st === 'SO').length
  const attn = []
  if (pend.length) attn.push(['p-warn', 'Pendente', `${pend.length} colaboradores ativos sem liberação.`, `${pend.filter(p => !p.aso).length} sem ASO e ${pend.filter(p => p.aso && !p.trein).length} com ASO mas sem treinamento. Obras: ${[...new Set(pend.map(p => p.obra))].join(', ')}.`])
  if (aDef.length) attn.push(['p-warn', 'Alojamento', `${aDef.length} alojado(s) sem local definido:`, aDef.map(p => p.nome).join(', ') + '.'])
  if (ph.f) attn.push(['p-crit', 'Faltas', `${ph.f} falta(s) hoje.`, 'Veja quem na aba Controle de ponto.'])
  if (qb) attn.push(['p-crit', 'Máquinas', `${qb} máquina(s) quebrada(s) ou em manutenção hoje.`, 'Veja quem ficou sem máquina em Controle de ponto › Máquinas.'])
  if (so) attn.push(['p-warn', 'Operador', `${so} máquina(s) sem operador hoje.`, ''])
  if (semL) attn.push(['p-warn', 'Ponto', `${semL} colaborador(es) sem lançamento de ponto hoje.`, ''])

  return (
    <section>
      <Kpis items={kpis} />
      <div className="grid">
        <div className="panel">
          <h2>Efetivo por obra de destino</h2>
          <div className="sub">Colaboradores por obra, separados por liberação (ASO + treinamento)</div>
          <div className="legend"><span><i style={{ background: 'var(--good)' }}></i>Liberado</span><span><i style={{ background: 'var(--warn)' }}></i>Pendente</span></div>
          <HBars rows={byObra} aria="Efetivo por obra" fmt={v => v + ' colaborador(es)'} />
        </div>
        <div className="panel">
          <h2>Controle de ponto · hoje</h2>
          <div className="sub">Lançamentos de hoje ({dataBR(hoje)}) · aba Controle de ponto</div>
          <HBars rows={ptRows} aria="Ponto de hoje" fmt={v => v + ' colaborador(es)'} />
        </div>
        <div className="panel">
          <h2>Ocupação dos alojamentos</h2>
          <div className="sub">Colaboradores alojados por local</div>
          <HBars rows={countBy(ativos.filter(p => p.alojado), p => p.alojamento || 'Sem nome').map(barraUnica('var(--series)'))} aria="Alojamentos" fmt={v => v + ' colaborador(es)'} />
        </div>
        <div className="panel">
          <h2>Efetivo por função</h2>
          <div className="sub">Quantidade de colaboradores em cada função</div>
          <HBars rows={countBy(ativos, p => p.funcao).map(barraUnica('var(--series)'))} aria="Funções" fmt={v => v + ' colaborador(es)'} />
        </div>
        <div className="panel span2">
          <h2>Pontos de atenção</h2>
          <div className="sub">O que precisa de ação antes da realocação</div>
          <Alerts items={attn} />
        </div>
      </div>
    </section>
  )
}
