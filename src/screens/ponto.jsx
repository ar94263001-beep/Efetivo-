import { useEffect, useMemo, useState } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import { usePref } from '../lib/usePref.js'
import { PT_ST, PT_NAME, PM_ST, PM_NAME, AUSENTE, isoOf, hojeISO, horas, pmHoras, mSit, maqDoDia, maqLabel, ptObra, pmObra, opDoDia, opNome, pmAvisos, saiPadrao } from '../lib/regras.js'
import { baixarCsv, linhasPonto, linhasPontoMaq } from '../lib/exportar.js'
import { Kpis, Status, SelectObra, CampoTexto, useToast } from '../components/index.jsx'

const PREF = { view: 'dia', tipo: 'col', ent: '07:00', sai: '17:00', saiSex: '16:00' }
const traco = <span style={{ color: 'var(--faint)' }}>—</span>
const nomeArq = (base, obra) => `${base}${obra ? '_' + obra.replace(/\s+/g, '_') : ''}.csv`
const diasDoMes = mes => { const [Y, M] = mes.split('-').map(Number), N = new Date(Y, M, 0).getDate()
  return Array.from({ length: N }, (_, i) => { const d = new Date(Y, M - 1, i + 1); return { n: i + 1, iso: isoOf(d), wk: [0, 6].includes(d.getDay()), dow: 'DSTQQSS'[d.getDay()] } }) }
const tituloDia = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
const tituloMes = mes => { const [Y, M] = mes.split('-').map(Number); return new Date(Y, M - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }

export default function Ponto({ F }) {
  const { people, machines, D, obrasNomes, carregarMes, lancarPonto, lancarPontoMaq } = useDados()
  const toast = useToast()
  const [pt, setPt] = usePref('efetivo-ponto', PREF)
  const [date, setDate] = useState(hojeISO())
  const [mes, setMes] = useState(hojeISO().slice(0, 7))
  const [q, setQ] = useState('')
  const set = (k, v) => setPt(x => ({ ...x, [k]: v }))
  const ehMaq = pt.tipo === 'maq', ehDia = pt.view === 'dia'
  useEffect(() => { carregarMes(ehDia ? date.slice(0, 7) : mes) }, [date, mes, ehDia])

  const busca = q.trim().toLowerCase()
  const pessoasDoDia = d => people.filter(p => p.situacao !== 'Desligado' && (!F.obra || (d ? ptObra(p, d, D.ponto) === F.obra : p.obraParts.includes(F.obra))) &&
    (!busca || (p.nome + ' ' + p.funcao + ' ' + maqLabel(D.maqCad.get(p.id), machines)).toLowerCase().includes(busca)))
    .sort((a, b) => a.obra.localeCompare(b.obra, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'))
  const maquinasDoDia = d => machines.filter(x => mSit(x) !== 'Desmobilizada' && (!F.obra || (d ? pmObra(x, d, D.pontoM) : x.obra) === F.obra) &&
    (!busca || (maqLabel(x.id, machines) + ' ' + (x.resp || '') + ' ' + (d ? opNome(x, d, D) : '')).toLowerCase().includes(busca)))
    .sort((a, b) => (d ? pmObra(a, d, D.pontoM) : a.obra || '').localeCompare(d ? pmObra(b, d, D.pontoM) : b.obra || '', 'pt-BR') || maqLabel(a.id, machines).localeCompare(maqLabel(b.id, machines), 'pt-BR', { numeric: true }))
  const padrao = d => id => ({ ent: pt.ent, sai: saiPadrao(d, pt.sai, pt.saiSex), maq: D.maqCad.get(id) || '' })
  const lancar = (d, id, patch) => lancarPonto(d, { [id]: patch }, padrao(d))

  function mudarDia(n) { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); setDate(isoOf(d)) }
  function abrirDia(d) { setDate(d); set('view', 'dia') }

  async function marcarTodos() {
    if (ehMaq) {
      const m = D.pontoM[date] || {}, alvo = maquinasDoDia(date).filter(x => !(m[x.id] && m[x.id].st))
      if (!alvo.length) return toast('Todas as máquinas já têm lançamento neste dia.')
      const r = await lancarPontoMaq(date, Object.fromEntries(alvo.map(x => [x.id, { st: 'OP' }])))
      if (!r.erro) toast(`${alvo.length} máquina(s) marcadas como operando.`)
      return
    }
    const m = D.ponto[date] || {}, alvo = pessoasDoDia(date).filter(p => !(m[p.id] && m[p.id].st))
    if (!alvo.length) return toast('Todos já têm lançamento neste dia.')
    const r = await lancarPonto(date, Object.fromEntries(alvo.map(p => [p.id, { st: 'P' }])), padrao(date))
    if (!r.erro) toast(`${alvo.length} marcado(s) como presentes.`)
  }
  function exportar(dias, mensal) {
    const linhas = ehMaq ? linhasPontoMaq(dias, maquinasDoDia, D) : linhasPonto(dias, pessoasDoDia, D)
    if (linhas.length === 1) return toast(mensal ? 'Nenhum lançamento neste mês.' : 'Nenhum lançamento neste dia.')
    const base = (ehMaq ? 'Ponto_Maquinas_' : 'Ponto_') + (mensal ? (ehDia ? date.slice(0, 7) : mes) : date)
    baixarCsv(nomeArq(base, F.obra), linhas)
  }
  const mesAtual = ehDia ? date.slice(0, 7) : mes
  const diasLancados = src => Object.keys(src).filter(d => d.startsWith(mesAtual)).sort()

  const legenda = ehMaq ? PM_ST : PT_ST
  return (
    <section>
      <div className="pt-bar">
        <div className="grp">
          <span className="seg" role="group" aria-label="Folha"><button aria-pressed={!ehMaq} onClick={() => set('tipo', 'col')}>Colaboradores</button><button aria-pressed={ehMaq} onClick={() => set('tipo', 'maq')}>Máquinas</button></span>
          <span className="seg" role="group" aria-label="Visão"><button aria-pressed={ehDia} onClick={() => set('view', 'dia')}>Dia</button><button aria-pressed={!ehDia} onClick={() => { setMes(date.slice(0, 7)); set('view', 'mes') }}>Mês</button></span>
          {ehDia ? <span id="ptDiaCtl" className="grp"><button className="btn small" onClick={() => mudarDia(-1)} aria-label="Dia anterior">◀</button>
            <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} aria-label="Data" />
            <button className="btn small" onClick={() => mudarDia(1)} aria-label="Próximo dia">▶</button><button className="btn small" onClick={() => setDate(hojeISO())}>Hoje</button></span>
            : <span className="grp"><input type="month" value={mes} onChange={e => e.target.value && setMes(e.target.value)} aria-label="Mês" /></span>}
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nome, função ou máquina" aria-label="Buscar no ponto" />
        </div>
        <div className="grp">
          {!ehMaq && <span className="grp"><label className="sel">Entrada <input type="time" value={pt.ent} onChange={e => set('ent', e.target.value)} /></label>
            <label className="sel">Saída seg–qui <input type="time" value={pt.sai} onChange={e => set('sai', e.target.value)} /></label>
            <label className="sel">Saída sexta <input type="time" value={pt.saiSex} onChange={e => set('saiSex', e.target.value)} /></label></span>}
          {ehDia && <button className="btn small primary" onClick={marcarTodos}>{ehMaq ? 'Marcar não lançadas como operando' : 'Marcar não lançados como presentes'}</button>}
          {ehDia && <button className="btn small" onClick={() => exportar([date], false)}>Exportar dia (CSV)</button>}
          <button className="btn small" onClick={() => exportar(diasLancados(ehMaq ? D.pontoM : D.ponto), true)}>Exportar mês (CSV)</button>
        </div>
      </div>
      {ehDia
        ? (ehMaq ? <DiaMaquinas date={date} lista={maquinasDoDia(date)} F={F} /> : <DiaColaboradores date={date} lista={pessoasDoDia(date)} F={F} lancar={lancar} />)
        : <Mes mes={mes} ehMaq={ehMaq} lista={ehMaq ? maquinasDoDia(null) : pessoasDoDia(null)} F={F} onDia={abrirDia} />}
      <div className="ptleg">{legenda.map(([k, n, c]) => <span key={k}><i style={{ background: c }}></i><b>{k}</b> {n}</span>)}</div>
      <div className="count" style={{ marginTop: 8 }}>{!ehDia ? 'Clique num dia para abrir o lançamento daquele dia.' : ehMaq
        ? 'O operador do dia vem do ponto dos colaboradores (quem foi lançado nesta máquina) ou, se ninguém foi, do cadastro. Trocar o operador aqui também atualiza a máquina no ponto do colaborador escolhido.'
        : 'Horas = saída − entrada, descontando 1h de almoço quando passa de 6h. A máquina é sugerida pelo cadastro e pode ser trocada. Mudar a obra aqui vale só para aquele dia. Tudo é gravado na hora, para toda a equipe.'}
        {obrasNomes.length === 0 && ' Cadastre uma obra na aba Equipe.'}</div>
    </section>
  )
}

function kpisPonto(lista, recs, sub, porDia) {
  const cnt = k => recs.filter(r => r && r.st === k).length, l = recs.filter(r => r && r.st).length, p = cnt('P')
  return [['Efetivo previsto', lista.length, sub], ['Presentes', p, l ? `${Math.round(p / l * 100)}% dos lançamentos` : 'Nada lançado ainda'],
    ['Faltas', cnt('F'), `${cnt('FJ')} justificada(s) · ${cnt('AT')} atestado(s)`], ['Folga / férias', cnt('FG') + cnt('FE'), `${cnt('FG')} folga · ${cnt('FE')} férias`],
    ['Sem lançamento', Math.max(0, (porDia ? lista.length : recs.length) - l), porDia ? 'Neste dia' : 'Dias úteis sem lançamento desde o 1º lançamento do mês']]
}
function kpisMaq(lista, recs, sub, porDia) {
  const cnt = k => recs.filter(r => r && r.st === k).length, l = recs.filter(r => r && r.st).length
  return [['Máquinas', lista.length, sub], ['Operando', cnt('OP'), l ? `${Math.round(cnt('OP') / l * 100)}% dos lançamentos` : 'Nada lançado ainda'],
    ['Quebradas / manutenção', cnt('QB') + cnt('MN'), `${cnt('QB')} quebrada(s) · ${cnt('MN')} manutenção`],
    ['Sem operador / paradas', cnt('SO') + cnt('PS'), `${cnt('SO')} sem operador · ${cnt('PS')} sem serviço · ${cnt('CH')} chuva`],
    ['Sem lançamento', Math.max(0, (porDia ? lista.length : recs.length) - l), porDia ? 'Neste dia' : 'Dias úteis sem lançamento desde o 1º lançamento do mês']]
}

function DiaColaboradores({ date, lista, F, lancar }) {
  const { machines, D, obrasNomes } = useDados()
  const m = D.ponto[date] || {}, mm = D.pontoM[date] || {}
  const maqOpts = useMemo(() => machines.slice().sort((a, b) => (a.obra || '').localeCompare(b.obra || '', 'pt-BR') || maqLabel(a.id, machines).localeCompare(maqLabel(b.id, machines), 'pt-BR', { numeric: true }))
    .map(x => ({ id: x.id, l: `${maqLabel(x.id, machines)} (${x.obra || 'sem obra'})` })), [machines])
  return <>
    <Kpis items={kpisPonto(lista, lista.map(p => m[p.id]), tituloDia(date) + (F.obra ? ' · ' + F.obra : ''), true)} />
    <div className="tablewrap"><table id="tPonto" className="ptcards">
      <thead><tr><th>Colaborador</th><th>Função</th><th>Obra no dia (alterar)</th><th>Lançamento</th><th>Entrada</th><th>Saída</th><th className="num">Horas</th><th>Máquina</th><th>Observação</th></tr></thead>
      <tbody>{lista.map(p => { const r = m[p.id] || {}, h = horas(r), ob = r.obra || p.obra, mid = maqDoDia(r, p, D), mr = mm[mid]
        return <tr key={p.id}>
          <td>{p.nome}<div className="so-mesa muted" style={{ fontSize: 11, fontWeight: 400 }}>{p.funcao}</div></td>
          <td data-label="Função">{p.funcao}</td>
          <td data-label="Obra no dia"><SelectObra value={ob} obras={obrasNomes} label={`Obra de ${p.nome} no dia`} onChange={v => lancar(date, p.id, { obra: v === p.obra ? '' : v })} />
            {r.obra && r.obra !== p.obra && <div className="muted" style={{ fontSize: 11 }}>cadastro: {p.obra}</div>}</td>
          <td className="full" data-label="Lançamento"><Status opcoes={PT_ST} valor={r.st} onChange={st => lancar(date, p.id, { st })} /></td>
          <td data-label="Entrada"><CampoTexto type="time" className="tm" value={r.ent} disabled={r.st !== 'P'} aria-label={`Entrada de ${p.nome}`} onSave={v => lancar(date, p.id, { ent: v })} /></td>
          <td data-label="Saída"><CampoTexto type="time" className="tm" value={r.sai} disabled={r.st !== 'P'} aria-label={`Saída de ${p.nome}`} onSave={v => lancar(date, p.id, { sai: v })} /></td>
          <td className="num" data-label="Horas">{h == null ? traco : h.toLocaleString('pt-BR') + ' h'}</td>
          <td data-label="Máquina"><select className="pmq" value={mid} aria-label={`Máquina de ${p.nome}`} onChange={e => lancar(date, p.id, { maq: e.target.value })}>
            <option value="">—</option>{maqOpts.map(x => <option key={x.id} value={x.id}>{x.l}</option>)}</select>
            {r.maq === undefined && mid && <span className="muted" style={{ display: 'block', fontSize: 11 }}>conforme cadastro</span>}
            {mr && ['QB', 'MN'].includes(mr.st) && <span className="ptwarn">Máquina {mr.st === 'QB' ? 'quebrada' : 'em manutenção'} hoje — remanejar operador</span>}</td>
          <td className="full" data-label="Observação"><CampoTexto className="ob" value={r.obs} placeholder="—" aria-label={`Observação de ${p.nome}`} onSave={v => lancar(date, p.id, { obs: v })} /></td>
        </tr> })}
      {!lista.length && <tr><td colSpan={9} className="muted">Nenhum colaborador ativo com esses filtros.</td></tr>}</tbody>
    </table></div>
  </>
}

function DiaMaquinas({ date, lista, F }) {
  const { people, machines, D, obrasNomes, lancarPonto, lancarPontoMaq } = useDados()
  const m = D.pontoM[date] || {}, pc = D.ponto[date] || {}
  const pessoas = useMemo(() => people.filter(p => p.situacao !== 'Desligado').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.obra.localeCompare(b.obra, 'pt-BR')), [people])
  const lancar = (id, patch) => lancarPontoMaq(date, { [id]: patch })
  async function trocarOperador(mid, pid) {
    const r = await lancar(mid, { op: pid })
    if (!r.erro && pid && pid !== '__cad') await lancarPonto(date, { [pid]: { maq: mid } }, () => ({ ent: '', sai: '', maq: mid }))
  }
  return <>
    <Kpis items={kpisMaq(lista, lista.map(x => m[x.id]), tituloDia(date) + (F.obra ? ' · ' + F.obra : ''), true)} />
    <div className="tablewrap"><table id="tPontoM" className="ptcards">
      <thead><tr><th>Máquina</th><th>Obra no dia (alterar)</th><th>Situação</th><th>Operador do dia</th><th>Horímetro inicial</th><th>Horímetro final</th><th className="num">Horas máq.</th><th>Observação</th></tr></thead>
      <tbody>{lista.map(x => { const r = m[x.id] || {}, o = opDoDia(x, date, D), h = pmHoras(r), ob = pmObra(x, date, D.pontoM), av = pmAvisos(x, date, r.st, D)
        return <tr key={x.id}>
          <td><b>{x.placa || '—'}</b> · {x.item}<div className="muted" style={{ fontSize: 11 }}>cadastro: {x.resp || 'sem operador'} · {x.obra || ''}</div></td>
          <td data-label="Obra no dia"><SelectObra value={ob} obras={obrasNomes} label={`Obra de ${maqLabel(x.id, machines)} no dia`} onChange={v => lancar(x.id, { obra: v === x.obra ? '' : v })} /></td>
          <td className="full" data-label="Situação"><Status opcoes={PM_ST} valor={r.st} onChange={st => lancar(x.id, { st })} /></td>
          <td className="full" data-label="Operador do dia"><select className="pmop" value={o.id} aria-label={`Operador de ${maqLabel(x.id, machines)}`} onChange={e => trocarOperador(x.id, e.target.value)}>
            <option value="">— sem operador —</option>
            {x.resp && o.id === '__cad' && <option value="__cad">{x.resp} (cadastro, fora da lista)</option>}
            {pessoas.map(p => { const rp = pc[p.id], tag = rp && AUSENTE.includes(rp.st) ? ' · ' + rp.st : ''; return <option key={p.id} value={p.id}>{p.nome} ({ptObra(p, date, D.ponto)}{tag})</option> })}
          </select>
            <span className="muted" style={{ display: 'block', fontSize: 11 }}>{o.origem === 'lançado' ? 'definido aqui' : o.origem === 'ponto' ? 'pelo ponto dos colaboradores' : 'conforme cadastro'}</span>
            {av.map((a, i) => <span key={i} className={'ptwarn ' + a[0]}>{a[1]}</span>)}</td>
          <td data-label="Horímetro inicial"><CampoTexto className="hm" inputMode="decimal" value={r.hi} placeholder="0,0" aria-label="Horímetro inicial" onSave={v => lancar(x.id, { hi: v })} /></td>
          <td data-label="Horímetro final"><CampoTexto className="hm" inputMode="decimal" value={r.hf} placeholder="0,0" aria-label="Horímetro final" onSave={v => lancar(x.id, { hf: v })} /></td>
          <td className="num" data-label="Horas máq.">{h == null ? traco : h.toLocaleString('pt-BR') + ' h'}</td>
          <td className="full" data-label="Observação"><CampoTexto className="ob" value={r.obs} placeholder="Ex.: quebrou a mangueira, operador foi para outra obra" aria-label="Observação" onSave={v => lancar(x.id, { obs: v })} /></td>
        </tr> })}
      {!lista.length && <tr><td colSpan={8} className="muted">Nenhuma máquina com esses filtros.</td></tr>}</tbody>
    </table></div>
  </>
}

function Mes({ mes, ehMaq, lista, F, onDia }) {
  const { D, machines } = useDados()
  const dias = diasDoMes(mes), hoje = hojeISO(), M = +mes.slice(5)
  const src = ehMaq ? D.pontoM : D.ponto, ST = ehMaq ? PM_ST : PT_ST, NOME = ehMaq ? PM_NAME : PT_NAME
  const cor = Object.fromEntries(ST.map(x => [x[0], x[2]]))
  const primeiro = Object.keys(src).filter(k => k.startsWith(mes) && Object.values(src[k]).some(r => r && r.st)).sort()[0] || '9999'
  const recs = []
  const linhas = lista.map(x => {
    const t = {}; let hs = 0
    const celulas = dias.map(d => {
      const r = (src[d.iso] || {})[x.id]
      if (r && r.st) { t[r.st] = (t[r.st] || 0) + 1; hs += (ehMaq ? pmHoras(r) : horas(r)) || 0 }
      if (!d.wk && d.iso <= hoje && d.iso >= primeiro) recs.push(r); else if (r && r.st) recs.push(r)
      if (!(r && r.st)) return <td key={d.n} className={'cd e' + (d.wk ? ' wk' : '')} title={`${d.n}/${M} · sem lançamento`} onClick={() => onDia(d.iso)}>·</td>
      const extra = ehMaq ? ` · ${opNome(x, d.iso, D) || 'sem operador'}` : (r.maq ? ' · ' + maqLabel(r.maq, machines) : '')
      return <td key={d.n} className="cd" style={{ background: cor[r.st] }} onClick={() => onDia(d.iso)}
        title={`${ehMaq ? maqLabel(x.id, machines) : x.nome} · ${d.n}/${M} · ${NOME[r.st]}${extra}${r.obra ? ' · obra: ' + r.obra : ''}${r.obs ? ' · ' + r.obs : ''}`}>{r.st}</td>
    })
    const totais = ehMaq ? [t.OP || 0, (t.QB || 0) + (t.MN || 0), (t.SO || 0) + (t.PS || 0), t.CH || 0] : [t.P || 0, t.F || 0, (t.FJ || 0) + (t.AT || 0), (t.FG || 0) + (t.FE || 0)]
    return <tr key={x.id}>
      <td>{ehMaq ? `${x.placa || '—'} · ${x.item}` : x.nome}<div className="muted" style={{ fontSize: 11 }}>{ehMaq ? `${x.resp || ''} · ${x.obra || ''}` : `${x.funcao} · ${x.obra}`}</div></td>
      {celulas}
      {totais.map((v, i) => <td key={i} className="num" style={i === 1 ? { color: 'var(--crit)' } : undefined}>{v}</td>)}
      <td className="num">{hs ? hs.toLocaleString('pt-BR') : '—'}</td>
    </tr>
  })
  const sub = tituloMes(mes) + (F.obra ? ' · ' + F.obra : '')
  const cab = ehMaq ? ['OP', 'QB+MN', 'SO+PS', 'CH'] : ['P', 'F', 'FJ+AT', 'FG+FE']
  return <>
    <Kpis items={ehMaq ? kpisMaq(lista, recs, sub, false) : kpisPonto(lista, recs, sub, false)} />
    <div className="tablewrap"><table className="mgrid">
      <thead><tr><th>{ehMaq ? 'Máquina' : 'Colaborador'}</th>{dias.map(d => <th key={d.n} className={(d.iso === hoje ? 'today' : '') + (d.wk ? ' wk' : '')}>{d.n}<div style={{ fontSize: 10, color: 'var(--faint)' }}>{d.dow}</div></th>)}
        {cab.map(c => <th key={c} className="num">{c}</th>)}<th className="num">Horas</th></tr></thead>
      <tbody>{linhas}{!lista.length && <tr><td colSpan={dias.length + 6} className="muted">Nada com esses filtros.</td></tr>}</tbody>
    </table></div>
  </>
}
