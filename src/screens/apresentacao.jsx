import { useEffect, useRef, useState } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import { usePref } from '../lib/usePref.js'
import { hojeISO, mSit, operador, pontoResumo, pct, countBy } from '../lib/regras.js'
import { HBars, Donut, barraUnica, useToast } from '../components/index.jsx'

const SLIDES = ['Capa', 'Resumo executivo', 'Efetivo por obra', 'Liberação ASO e treinamento', 'Alojamentos', 'Máquinas e equipamentos', 'Riscos e qualidade dos dados', 'Decisões para a Diretoria']
const NOTAS = [
  'Abra dizendo que os números são ao vivo: vêm direto do sistema onde a equipe atualiza o efetivo.',
  'Três mensagens: quantos ainda não podem trabalhar, como está o ponto de hoje e as máquinas em campo.',
  'Mostre onde estão as pendências. Atualize ASO e treinamento na aba Colaboradores.',
  'Explique a regra: sem ASO e sem treinamento, o colaborador não entra em obra. A tabela mostra quem falta.',
  'Aponte os alojamentos lotados e os casos a definir.',
  'Destaque obras sem máquina cadastrada e máquinas sem operador identificado no cadastro.',
  'Os quatro riscos que podem distorcer os números.',
  'Feche pedindo as decisões. Preencha responsável e prazo durante a reunião.']

function resumo(people, machines, ponto, obra) {
  const at = people.filter(p => p.situacao !== 'Desligado' && (!obra || p.obraParts.includes(obra)))
  const lib = at.filter(p => p.status === 'Liberado'), pend = at.filter(p => p.status === 'Pendente')
  const aloj = at.filter(p => p.alojado)
  const maq = machines.filter(m => mSit(m) !== 'Desmobilizada' && (!obra || m.obra === obra))
  const byObra = [...new Set(at.map(p => p.obra))].map(o => { const g = at.filter(p => p.obra === o); return { o, n: g.length, l: g.filter(p => p.status === 'Liberado').length } }).sort((a, b) => b.n - a.n)
  return { at, lib, pend, aloj, maq, byObra, ph: pontoResumo(at, ponto, hojeISO()),
    semAso: pend.filter(p => !p.aso), semTr: pend.filter(p => p.aso && !p.trein), dup: at.filter(p => p.obraParts.length > 1),
    aDef: aloj.filter(p => !p.alojamento || /a definir|dfdf|verificar/i.test(p.alojamento)),
    obrasSemMaq: [...new Set(at.flatMap(p => p.obraParts))].filter(o => !machines.some(m => m.obra === o && mSit(m) !== 'Desmobilizada')),
    semOp: maq.filter(m => !operador(m, people)) }
}

const T = ({ t, s }) => <div><h3 className="st">{t}</h3>{s && <div className="ss">{s}</div>}</div>
const K = ({ v, l }) => <div className="k"><div className="v">{v}</div><div className="l">{l}</div></div>
const Ins = ({ cor, n, children }) => <div className="ins" style={{ borderLeftColor: cor }}><span className="num" style={{ color: cor }}>{n}</span><div>{children}</div></div>
const Leg = ({ parts }) => <div className="legend" style={{ fontSize: '1cqw', color: '#5B6B7F' }}>{parts.map(p => <span key={p.n}><i style={{ background: p.c }}></i>{p.n} · {p.v}</span>)}</div>

function Slide({ i, d, obra }) {
  const pl = pct(d.lib.length, d.at.length), escopo = obra ? `Obra: ${obra}` : 'Todas as obras'
  switch (i) {
    case 0: return <div className="cover"><div style={{ fontSize: '1.2cqw', letterSpacing: '.14em', textTransform: 'uppercase', color: '#F2B705', fontWeight: 600 }}>Apresentação à Diretoria · {escopo}</div>
      <h2>Efetivo e realocação <span>das obras</span></h2><p>Status do efetivo, liberação de ASO e treinamento, ponto diário, alojamento e máquinas. Dados ao vivo em {new Date().toLocaleDateString('pt-BR')}.</p>
      <div className="ck"><div><b>{d.at.length}</b><span>colaboradores ativos</span></div><div><b>{pl}%</b><span>liberados</span></div><div><b>{d.ph.p}</b><span>presentes hoje</span></div><div><b>{d.maq.length}</b><span>máquinas</span></div></div></div>
    case 1: return <><T t="Resumo executivo" s={escopo} />
      <div className="row" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}><K v={d.at.length} l="Colaboradores ativos" /><K v={pl + '%'} l="Liberados para trabalhar" /><K v={d.ph.p + ' / ' + d.at.length} l="Presentes hoje" /><K v={d.aloj.length} l="Alojados" /><K v={d.maq.length} l="Máquinas e equip." /></div>
      <div className="row" style={{ gridTemplateRows: 'repeat(3,auto)', flex: 1 }}>
        <Ins cor="var(--o)" n="1"><b>{d.pend.length} colaboradores ainda não podem trabalhar.</b> {d.semAso.length} estão sem ASO e {d.semTr.length} têm ASO mas não concluíram o treinamento.</Ins>
        <Ins cor="var(--r)" n="2"><b>Ponto de hoje: {d.ph.p} presentes, {d.ph.f} falta(s)</b>{d.at.length - d.ph.l ? ` e ${d.at.length - d.ph.l} sem lançamento` : ''}.</Ins>
        <Ins cor="var(--g)" n="3"><b>{d.maq.length} máquinas em campo</b>{d.semOp.length ? `, ${d.semOp.length} sem operador identificado no cadastro` : ''}.</Ins>
      </div></>
    case 2: { const full = d.byObra.filter(o => o.n >= 3 && o.l === o.n).map(o => o.o)
      return <><T t={!d.pend.length ? 'Todo o efetivo está liberado' : full.length ? `${full.join(', ')} 100% liberado · ${d.pend.length} pendências nas demais obras` : `${d.pend.length} pendências de liberação`} s="Colaboradores ativos por obra de destino, liberados × pendentes" />
        <div className="row" style={{ gridTemplateColumns: '1.15fr 1fr', flex: 1 }}>
          <div className="box"><div className="legend" style={{ fontSize: '1cqw' }}><span><i style={{ background: 'var(--g)' }}></i>Liberado</span><span><i style={{ background: 'var(--o)' }}></i>Pendente</span></div>
            <div className="chart"><HBars rows={d.byObra.map(o => ({ label: o.o, total: o.n, text: String(o.n), parts: [{ v: o.l, color: '#1F8A4C', name: 'Liberados' }, { v: o.n - o.l, color: '#E08A00', name: 'Pendentes' }] }))} aria="Efetivo por obra" fmt={v => v + ' colaborador(es)'} /></div></div>
          <div className="box"><h4>Resumo por obra</h4><table className="tbl"><thead><tr><th>Obra</th><th className="n">Ativos</th><th className="n">Liberados</th><th className="n">%</th></tr></thead>
            <tbody>{d.byObra.map(o => <tr key={o.o}><td>{o.o}</td><td className="n">{o.n}</td><td className="n">{o.l}</td><td className="n">{pct(o.l, o.n)}%</td></tr>)}</tbody></table></div>
        </div></> }
    case 3: { const parts = [{ n: 'Liberados', v: d.lib.length, c: '#1F8A4C' }, { n: 'Sem ASO', v: d.semAso.length, c: '#C8372D' }, { n: 'Sem treinamento', v: d.semTr.length, c: '#E08A00' }]
      return <><T t={`${pl}% do efetivo liberado`} s="Liberação exige ASO em dia e treinamento concluído" />
        <div className="row" style={{ gridTemplateColumns: '1fr 1.6fr', flex: 1 }}>
          <div className="box"><div className="chart"><Donut parts={parts} center={pl + '%'} sub="liberados" /></div><Leg parts={parts} /></div>
          <div className="box"><h4>Pendências ({d.pend.length})</h4><div style={{ overflow: 'hidden' }}><table className="tbl"><thead><tr><th>Colaborador</th><th>Obra</th><th>Falta</th></tr></thead>
            <tbody>{d.pend.slice().sort((a, b) => a.obra.localeCompare(b.obra)).slice(0, 12).map(p => <tr key={p.id}><td>{p.nome}</td><td>{p.obra}</td><td>{!p.aso ? 'ASO' : 'Treinamento'}</td></tr>)}</tbody></table>
            {d.pend.length > 12 && <div className="ss">+ {d.pend.length - 12} na aba Colaboradores</div>}</div></div>
        </div></> }
    case 4: return <><T t={`${d.aloj.length} alojados em ${new Set(d.aloj.map(p => p.alojamento)).size} locais`} s={d.aDef.length ? `${d.aDef.length} com local indefinido ou a corrigir` : 'Todos com local definido'} />
      <div className="row" style={{ gridTemplateColumns: '1.5fr 1fr', flex: 1 }}>
        <div className="box"><h4>Ocupação por alojamento</h4><div className="chart"><HBars rows={countBy(d.aloj, p => p.alojamento || 'Sem nome').map(barraUnica('#2A78D6'))} aria="Alojamentos" fmt={v => v + ' colaborador(es)'} /></div></div>
        <div className="box"><h4>A definir ou corrigir</h4>{d.aDef.length ? <table className="tbl"><tbody>{d.aDef.map(p => <tr key={p.id}><td>{p.nome}</td><td>{p.alojamento || '—'}</td></tr>)}</tbody></table> : <div className="ss">Nenhum.</div>}</div>
      </div></>
    case 5: return <><T t={d.obrasSemMaq.length ? `${d.obrasSemMaq.join(', ')} sem máquinas cadastradas` : `${d.maq.length} máquinas em campo`} s="Máquinas e equipamentos ativos por obra" />
      <div className="row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}><K v={d.maq.length} l="Máquinas e equip." /><K v={d.maq.filter(m => mSit(m) === 'Em operação').length} l="Em operação" />
        <K v={d.maq.filter(m => ['Parada', 'Em manutenção'].includes(mSit(m))).length} l="Paradas ou em manutenção" /><K v={d.semOp.length} l="Sem operador identificado" /></div>
      <div className="row" style={{ gridTemplateColumns: '1fr 1.3fr', flex: 1 }}>
        <div className="box"><h4>Por obra</h4><div className="chart"><HBars rows={countBy(d.maq, m => m.obra).map(barraUnica('#2A78D6'))} aria="Máquinas por obra" fmt={v => v + ' máquina(s)'} /></div></div>
        <div className="box"><h4>Máquinas</h4><table className="tbl"><thead><tr><th>Item</th><th>Obra</th><th>Responsável</th></tr></thead>
          <tbody>{d.maq.slice(0, 9).map(m => <tr key={m.id}><td>{m.item}</td><td>{m.obra}</td><td>{m.resp || '—'}</td></tr>)}</tbody></table></div>
      </div></>
    case 6: { const tiles = [['#2A78D6', 'ASO e treinamento', d.pend.length, `pendentes de liberação (${d.semAso.length} sem ASO)`],
      ['#1B2A4A', 'Faltas hoje', d.ph.f, `falta(s) lançadas no ponto · ${d.at.length - d.ph.l} sem lançamento`],
      ['#C8372D', 'Alojamento indefinido', d.aDef.length, 'alojados sem local definido ou com nome a corrigir'],
      ['#E0A800', 'Máquinas', d.obrasSemMaq.length, `obra(s) com efetivo e sem máquina cadastrada${d.obrasSemMaq.length ? ': ' + d.obrasSemMaq.join(', ') : ''}`]]
      return <><T t="Riscos e qualidade dos dados" s="O que pode distorcer a leitura dos números" />
        <div className="row" style={{ gridTemplateColumns: 'repeat(4,1fr)', flex: 1 }}>{tiles.map((x, j) => <div key={j} className="tile" style={{ background: x[0] }}>
          <div className="t1">{j + 1}</div><div className="t2"><b>{x[1]}</b></div><div className="t2">{x[3]}</div><div className="t3">{x[2]}</div></div>)}</div></> }
    default: { const dec = []
      if (d.pend.length) dec.push([<>Priorizar ASO e treinamento de <b>{d.pend.length} colaboradores</b> ({[...new Set(d.pend.map(p => p.obra))].slice(0, 3).join(', ')})</>, 'RH / SESMT'])
      if (d.dup.length) dec.push([<>Definir uma obra única para os <b>{d.dup.length} colaboradores</b> com destino duplo</>, 'Engenharia'])
      if (d.obrasSemMaq.length) dec.push([<>Cadastrar e alocar máquinas para <b>{d.obrasSemMaq.join(', ')}</b></>, 'Equipamentos'])
      if (d.aDef.length) dec.push([<>Definir alojamento de <b>{d.aDef.length} colaborador(es)</b></>, 'Administrativo'])
      return <><T t="Decisões solicitadas à Diretoria" s="Responsável e prazo a definir na reunião" />
        <div className="row" style={{ gridTemplateRows: `repeat(${Math.max(dec.length, 1)},auto)` }}>{dec.length ? dec.map((x, j) => <div key={j} className="dec"><span className="num">{j + 1}</span><div>{x[0]}</div><div className="who">{x[1]} · prazo: ____</div></div>)
          : <div className="ins"><div>Nenhuma pendência que exija decisão.</div></div>}</div></> }
  }
}

export default function Apresentacao() {
  const { people, machines, ponto, obrasNomes } = useDados()
  const toast = useToast()
  const [idx, setIdx] = usePref('efetivo-slide', 0)
  const [obra, setObra] = useState('')
  const deck = useRef(null)
  const i = Math.max(0, Math.min(SLIDES.length - 1, idx))
  const ir = n => setIdx(Math.max(0, Math.min(SLIDES.length - 1, n)))
  const d = resumo(people, machines, ponto, obra)

  useEffect(() => {
    const tecla = e => {
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || document.querySelector('dialog[open]')) return
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); setIdx(n => Math.min(SLIDES.length - 1, n + 1)) }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); setIdx(n => Math.max(0, n - 1)) }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [])
  const telaCheia = () => { const el = deck.current; if (el && el.requestFullscreen) el.requestFullscreen().catch(() => toast('Tela cheia não disponível aqui. Use o zoom do navegador.')); else toast('Tela cheia não disponível aqui.') }

  return (
    <section>
      <div className="deck-bar">
        <div className="grp"><button className="btn small" onClick={() => ir(i - 1)} disabled={i === 0}>◀ Anterior</button><span className="count">{i + 1} de {SLIDES.length} · {SLIDES[i]}</span><button className="btn small" onClick={() => ir(i + 1)} disabled={i === SLIDES.length - 1}>Próximo ▶</button></div>
        <div className="grp"><label className="sel">Obra <select value={obra} onChange={e => setObra(e.target.value)}><option value="">Todas as obras</option>{obrasNomes.map(o => <option key={o}>{o}</option>)}</select></label><button className="btn small" onClick={telaCheia}>Tela cheia</button></div>
      </div>
      <div className="deck" ref={deck} tabIndex={0} aria-roledescription="apresentação" onClick={e => { if (!e.target.closest('button,a,select') && document.fullscreenElement) ir(i + 1) }}>
        {i === 0 ? <Slide i={0} d={d} obra={obra} /> : <>
          <aside className="side"><div className="brand">Efetivo<span>de obras</span></div><div className="upd">● Ao vivo · {people.length} cadastros · {machines.length} máquinas</div>
            <nav className="toc">{SLIDES.map((t, j) => <button key={j} aria-current={j === i} onClick={() => ir(j)}>{j + 1}. {t}</button>)}</nav>
            <div className="foot">{obra ? 'Filtro: ' + obra : 'Todas as obras'}</div></aside>
          <div className="main"><Slide i={i} d={d} obra={obra} /></div></>}
        <span className="pageno">{i + 1} / {SLIDES.length}</span>
      </div>
      <div className="notes"><b>Notas do apresentador:</b> {NOTAS[i]}</div>
    </section>
  )
}
