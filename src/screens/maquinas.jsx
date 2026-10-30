import { useState } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import { mSit, operador, M_SIT, TIPOS_MAQ } from '../lib/regras.js'
import { baixarCsv, linhasMaquinas } from '../lib/exportar.js'
import { Dialog, Pill, SelectObra, useToast } from '../components/index.jsx'

const COLS = [['item', 'Máquina / equipamento'], ['tipo', 'Tipo'], ['resp', 'Responsável'], ['obra', 'Obra (mudar aqui)'], ['situacao', 'Situação'], ['ano', 'Ano']]
const vazio = t => <span style={{ color: 'var(--faint)' }}>{t}</span>

export default function Maquinas({ F, MF }) {
  const { people, machines, obrasNomes, salvarMaquina } = useDados()
  const toast = useToast()
  const [sort, setSort] = useState(['item', 1])
  const [editando, setEditando] = useState(null)
  const q = MF.q.trim().toLowerCase()
  const lista = machines.filter(x => (!F.obra || x.obra === F.obra) && (!MF.tipo || x.tipo === MF.tipo) && (!MF.sit || mSit(x) === MF.sit) &&
    (!MF.op || (MF.op === 'com') === !!operador(x, people)) && (!q || (x.item + ' ' + x.resp + ' ' + (x.placa || '')).toLowerCase().includes(q)))
    .sort((a, b) => { const v = m => sort[0] === 'situacao' ? mSit(m) : (m[sort[0]] ?? ''); return String(v(a)).localeCompare(String(v(b)), 'pt-BR', { numeric: true }) * sort[1] })
  const semMaq = obrasNomes.filter(o => !machines.some(x => x.obra === o))

  async function trocarObra(x, obra) {
    if (obra === x.obra) return
    const r = await salvarMaquina({ id: x.id, obra })
    if (!r.erro) toast(`${x.item} agora está em ${obra}`)
  }

  return (
    <section>
      <div className="tb-head">
        <span className="count">{lista.length} de {machines.length} máquina(s)/equipamento(s){semMaq.length ? ` · sem máquinas: ${semMaq.join(', ')}` : ''} · "Operador no cadastro" cruza o responsável com a lista de colaboradores</span>
        <div className="acoes">
          <button className="btn small" onClick={() => baixarCsv('fMaquinas.csv', linhasMaquinas(machines))}>Exportar CSV</button>
          <button className="btn small primary" onClick={() => setEditando('nova')}>+ Inserir máquina</button>
        </div>
      </div>
      <div className="tablewrap"><table id="tMaq" className="cards">
        <thead><tr>{COLS.map(([k, n]) => <th key={k} className={'sortavel' + (k === 'ano' ? ' num' : '')} onClick={() => setSort(([s, d]) => [k, s === k ? -d : 1])}>{n}{sort[0] === k ? (sort[1] > 0 ? ' ▲' : ' ▼') : ''}</th>)}<th>Operador no cadastro</th><th></th></tr></thead>
        <tbody>{lista.map(x => { const op = operador(x, people), s = mSit(x); return <tr key={x.id} className={s === 'Desmobilizada' ? 'off' : ''}>
          <td data-label="Máquina">{x.item}{x.placa && <span className="muted"> · {x.placa}</span>}</td>
          <td data-label="Tipo">{x.tipo}</td>
          <td data-label="Responsável">{x.resp || vazio('—')}</td>
          <td data-label="Obra"><SelectObra value={x.obra} obras={obrasNomes} label={`Obra de ${x.item}`} onChange={o => trocarObra(x, o)} /></td>
          <td data-label="Situação"><Pill cls={s === 'Em operação' ? 'p-good' : s === 'Desmobilizada' ? 'p-off' : 'p-warn'}>{s}</Pill></td>
          <td data-label="Ano" className="num">{x.ano || vazio('—')}</td>
          <td data-label="Operador no cadastro">{op ? <>{op.nome}{!op.obraParts.includes(x.obra) && <> <Pill cls="p-warn">em {op.obra}</Pill></>}</> : vazio('Não encontrado')}</td>
          <td><button className="btn small" onClick={() => setEditando(x.id)}>Editar</button></td>
        </tr> })}
        {!lista.length && <tr><td colSpan={8} className="muted">Nenhuma máquina com esses filtros.</td></tr>}</tbody>
      </table></div>
      {editando && <FormMaquina id={editando === 'nova' ? null : editando} obraInicial={F.obra} onClose={() => setEditando(null)} />}
    </section>
  )
}

function FormMaquina({ id, obraInicial, onClose }) {
  const { people, machines, obrasNomes, salvarMaquina, excluirMaquina } = useDados()
  const toast = useToast()
  const atual = id ? machines.find(m => m.id === id) : null
  const [f, setF] = useState(() => atual ? { ...atual, situacao: mSit(atual), ano: atual.ano || '' } :
    { item: '', tipo: 'Máquinas', situacao: 'Em operação', obra: obraInicial || obrasNomes[0] || '', resp: '', placa: '', ano: '', obs: '' })
  const [novaObra, setNovaObra] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [armado, setArmado] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const tipos = [...new Set([...TIPOS_MAQ, ...machines.map(m => m.tipo).filter(Boolean)])]

  async function salvar(e) {
    e.preventDefault()
    const item = f.item.trim().replace(/\s+/g, ' ')
    const obra = f.obra === '__nova' ? novaObra.trim().replace(/\s+/g, ' ') : f.obra
    const anoTxt = String(f.ano).trim(), ano = anoTxt ? Number(anoTxt) : null
    const placa = f.placa.trim().toUpperCase()
    if (!item) return setErro('Preencha o nome da máquina ou equipamento.')
    if (!obra) return setErro('Digite o nome da nova obra.')
    if (ano !== null && (!Number.isInteger(ano) || ano < 1950 || ano > 2100)) return setErro('Ano deve ser um número entre 1950 e 2100.')
    if (placa && machines.some(m => m.id !== id && (m.placa || '').toUpperCase() === placa)) return setErro(`Já existe uma máquina com a identificação ${placa}.`)
    const dados = { item, tipo: f.tipo, situacao: f.situacao, obra, resp: f.resp.trim().replace(/\s+/g, ' '), placa, ano: ano || '', obs: f.obs.trim() }
    if (id) dados.id = id
    else dados.seq = Math.max(0, ...machines.map(m => +m.seq || 0)) + 1
    setSalvando(true)
    const r = await salvarMaquina(dados)
    setSalvando(false)
    if (r.erro) return setErro(r.erro)
    toast(id ? 'Alterações salvas' : `${item} inserida`)
    onClose()
  }
  async function excluir() {
    if (!armado) return setArmado(true)
    const r = await excluirMaquina(id)
    if (r.erro) return setErro(r.erro)
    toast(`${atual.item} excluída`); onClose()
  }

  return (
    <Dialog open title={id ? 'Editar máquina' : 'Nova máquina'} onClose={onClose}>
      <form onSubmit={salvar} noValidate>
        <div className="dlg-b">
          <div className="field full"><label className="flabel" htmlFor="m-item">Máquina / equipamento</label><input id="m-item" value={f.item} onChange={e => set('item', e.target.value)} placeholder="Ex.: Rolo compactador CA250" autoComplete="off" autoFocus /></div>
          <div className="field"><label className="flabel" htmlFor="m-tipo">Tipo</label><select id="m-tipo" value={f.tipo} onChange={e => set('tipo', e.target.value)}>{tipos.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label className="flabel" htmlFor="m-sit">Situação</label><select id="m-sit" value={f.situacao} onChange={e => set('situacao', e.target.value)}>{M_SIT.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label className="flabel" htmlFor="m-obra">Obra</label>
            <select id="m-obra" value={f.obra} onChange={e => set('obra', e.target.value)}>{obrasNomes.map(o => <option key={o}>{o}</option>)}{f.obra && f.obra !== '__nova' && !obrasNomes.includes(f.obra) && <option>{f.obra}</option>}<option value="__nova">+ Nova obra…</option></select></div>
          {f.obra === '__nova' && <div className="field"><label className="flabel" htmlFor="m-obra-nova">Nome da nova obra</label><input id="m-obra-nova" value={novaObra} onChange={e => setNovaObra(e.target.value)} autoFocus /></div>}
          <div className="field"><label className="flabel" htmlFor="m-resp">Operador / responsável</label><input id="m-resp" list="dl-nomes" value={f.resp} onChange={e => set('resp', e.target.value)} placeholder="Escolha da lista ou digite" autoComplete="off" />
            <datalist id="dl-nomes">{people.filter(p => p.situacao !== 'Desligado').map(p => <option key={p.id} value={p.nome}>{p.funcao}</option>)}</datalist></div>
          <div className="field"><label className="flabel" htmlFor="m-placa">Placa / identificação</label><input id="m-placa" value={f.placa} onChange={e => set('placa', e.target.value)} autoComplete="off" /></div>
          <div className="field"><label className="flabel" htmlFor="m-ano">Ano</label><input id="m-ano" type="number" min="1950" max="2100" step="1" value={f.ano} onChange={e => set('ano', e.target.value)} /></div>
          <div className="field full"><label className="flabel" htmlFor="m-obs">Observações</label><textarea id="m-obs" rows="2" value={f.obs} onChange={e => set('obs', e.target.value)} /></div>
          {erro && <div className="err">{erro}</div>}
        </div>
        <div className="dlg-f">
          <div>{id && <button type="button" className="btn danger" onClick={excluir}>{armado ? 'Confirmar exclusão' : 'Excluir máquina'}</button>}</div>
          <div><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button></div>
        </div>
      </form>
    </Dialog>
  )
}
