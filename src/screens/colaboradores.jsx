import { useState } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import { dataBR, norm, titleCase, SITUACOES, statusDe } from '../lib/regras.js'
import { baixarCsv, linhasColaboradores } from '../lib/exportar.js'
import { Dialog, Pill, SelectObra, useToast } from '../components/index.jsx'

const COLS = [['nome', 'Colaborador'], ['funcao', 'Função'], ['obra', 'Obra (mudar aqui)'], ['status', 'Liberação'], ['aso', 'ASO'], ['trein', 'Trein.'], ['alojamento', 'Alojamento'], ['admissao', 'Admissão']]
const nao = <span style={{ color: 'var(--warn)' }}>Não</span>
const vazio = t => <span style={{ color: 'var(--faint)' }}>{t}</span>

export default function Colaboradores({ P, F }) {
  const { people, obrasNomes, salvarColaborador } = useDados()
  const toast = useToast()
  const [sort, setSort] = useState(['nome', 1])
  const [editando, setEditando] = useState(null) // null | 'novo' | id
  const rows = [...P].sort((a, b) => { const x = a[sort[0]] ?? '', y = b[sort[0]] ?? ''; return (typeof x === 'string' ? x.localeCompare(y, 'pt-BR') : (x > y ? 1 : x < y ? -1 : 0)) * sort[1] })
  const ordenar = k => setSort(([s, d]) => [k, s === k ? -d : 1])

  async function trocarObra(p, obra) {
    if (obra === p.obra) return
    const r = await salvarColaborador({ id: p.id, obra })
    if (!r.erro) toast(`${p.nome.split(' ')[0]} agora está em ${obra}`)
  }

  return (
    <section>
      <div className="tb-head">
        <span className="count">{rows.length} colaborador(es) no filtro · clique em Editar para alterar dados, ou troque a obra direto na coluna</span>
        <div className="acoes">
          <button className="btn small" onClick={() => baixarCsv('fColaboradores.csv', linhasColaboradores(people))}>Exportar CSV</button>
          <button className="btn small primary" onClick={() => setEditando('novo')}>+ Inserir colaborador</button>
        </div>
      </div>
      <div className="tablewrap"><table id="tPessoas" className="cards">
        <thead><tr>{COLS.map(([k, n]) => <th key={k} className="sortavel" onClick={() => ordenar(k)}>{n}{sort[0] === k ? (sort[1] > 0 ? ' ▲' : ' ▼') : ''}</th>)}<th></th></tr></thead>
        <tbody>{rows.map(p => <tr key={p.id} className={p.situacao === 'Desligado' ? 'off' : ''}>
          <td data-label="Colaborador">{p.nome}</td>
          <td data-label="Função">{p.funcao}</td>
          <td data-label="Obra"><SelectObra value={p.obra} obras={obrasNomes} label={`Obra de ${p.nome}`} onChange={o => trocarObra(p, o)} /></td>
          <td data-label="Liberação">{p.situacao === 'Desligado' ? <Pill cls="p-off">Desligado</Pill> : <Pill cls={p.status === 'Liberado' ? 'p-good' : 'p-warn'}>{p.status}</Pill>}</td>
          <td data-label="ASO">{p.aso ? 'Sim' : nao}</td>
          <td data-label="Trein.">{p.trein ? 'Sim' : nao}</td>
          <td data-label="Alojamento">{p.alojado ? (p.alojamento || 'Sem nome') : vazio('Não alojado')}</td>
          <td data-label="Admissão" className="num">{p.admissao ? dataBR(p.admissao) : vazio('—')}</td>
          <td><button className="btn small" onClick={() => setEditando(p.id)}>Editar</button></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={9} className="muted">Nenhum colaborador com esses filtros.</td></tr>}</tbody>
      </table></div>
      {editando && <FormColaborador id={editando === 'novo' ? null : editando} obraInicial={F.obra} onClose={() => setEditando(null)} />}
    </section>
  )
}

function FormColaborador({ id, obraInicial, onClose }) {
  const { people, obrasNomes, salvarColaborador, excluirColaborador } = useDados()
  const toast = useToast()
  const atual = id ? people.find(p => p.id === id) : null
  const [f, setF] = useState(() => atual ? { ...atual, admissao: atual.admissao || '' } :
    { nome: '', funcao: '', obra: obraInicial || obrasNomes[0] || '', situacao: 'Ativo', admissao: '', dias: 5, aso: false, trein: false, alojado: false, alojamento: '', obs: '' })
  const [novaObra, setNovaObra] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [armado, setArmado] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const funcs = [...new Set(people.map(p => p.funcao).filter(Boolean))]
  const alojs = [...new Set(people.filter(p => p.alojado && p.alojamento).map(p => p.alojamento))]
  const st = statusDe(f)

  async function salvar(e) {
    e.preventDefault()
    const nome = titleCase(f.nome), funcao = f.funcao.trim().replace(/\s+/g, ' ')
    const obra = f.obra === '__nova' ? novaObra.trim().replace(/\s+/g, ' ') : f.obra
    const dias = Number(f.dias)
    if (!nome) return setErro('Preencha o nome do colaborador.')
    if (!funcao) return setErro('Preencha a função.')
    if (!obra) return setErro('Digite o nome da nova obra.')
    if (!Number.isInteger(dias) || dias < 0 || dias > 7) return setErro('Dias trabalhados deve ser um número de 0 a 7.')
    if (!id && people.some(p => norm(p.nome) === norm(nome))) return setErro(`Já existe um colaborador chamado ${nome}. Use Editar na tabela para alterar o cadastro.`)
    const dados = { nome, funcao, obra, situacao: f.situacao, admissao: f.admissao || null, dias, aso: f.aso, trein: f.trein, alojado: f.alojado,
      alojamento: f.alojado ? (f.alojamento.trim() || 'A definir') : '', obs: f.obs.trim() }
    if (id) dados.id = id
    else dados.seq = Math.max(0, ...people.map(p => +p.seq || 0)) + 1
    setSalvando(true)
    const r = await salvarColaborador(dados)
    setSalvando(false)
    if (r.erro) return setErro(r.erro)
    toast(id ? 'Alterações salvas' : `${nome} inserido`)
    onClose()
  }
  async function excluir() {
    if (!armado) return setArmado(true)
    const r = await excluirColaborador(id)
    if (r.erro) return setErro(r.erro)
    toast(`${atual.nome} excluído`); onClose()
  }

  return (
    <Dialog open title={id ? 'Editar colaborador' : 'Novo colaborador'} onClose={onClose}>
      <form onSubmit={salvar} noValidate>
        <div className="dlg-b">
          <div className="field full"><label className="flabel" htmlFor="f-nome">Nome completo</label><input id="f-nome" value={f.nome} onChange={e => set('nome', e.target.value)} autoComplete="off" autoFocus /></div>
          <div className="field"><label className="flabel" htmlFor="f-funcao">Função</label><input id="f-funcao" list="dl-funcao" value={f.funcao} onChange={e => set('funcao', e.target.value)} autoComplete="off" />
            <datalist id="dl-funcao">{funcs.map(x => <option key={x} value={x} />)}</datalist></div>
          <div className="field"><label className="flabel" htmlFor="f-obra">Obra de destino</label>
            <select id="f-obra" value={f.obra} onChange={e => set('obra', e.target.value)}>{obrasNomes.map(o => <option key={o}>{o}</option>)}{f.obra && f.obra !== '__nova' && !obrasNomes.includes(f.obra) && <option>{f.obra}</option>}<option value="__nova">+ Nova obra…</option></select></div>
          {f.obra === '__nova' && <div className="field"><label className="flabel" htmlFor="f-obra-nova">Nome da nova obra</label><input id="f-obra-nova" value={novaObra} onChange={e => setNovaObra(e.target.value)} placeholder="Ex.: Terras 7" autoFocus /></div>}
          <div className="field"><label className="flabel" htmlFor="f-sit">Situação</label><select id="f-sit" value={f.situacao} onChange={e => set('situacao', e.target.value)}>{SITUACOES.map(s => <option key={s}>{s}</option>)}</select></div>
          <div className="field"><label className="flabel" htmlFor="f-adm">Data de admissão</label><input id="f-adm" type="date" value={f.admissao} onChange={e => set('admissao', e.target.value)} /></div>
          <div className="field"><label className="flabel" htmlFor="f-dias">Dias trabalhados na semana</label><input id="f-dias" type="number" min="0" max="7" step="1" value={f.dias} onChange={e => set('dias', e.target.value)} /></div>
          <div className="field full"><span className="flabel">Documentação e alojamento</span>
            <div className="toggles">
              <label><input type="checkbox" checked={f.aso} onChange={e => set('aso', e.target.checked)} /> ASO em dia</label>
              <label><input type="checkbox" checked={f.trein} onChange={e => set('trein', e.target.checked)} /> Treinamento concluído</label>
              <label><input type="checkbox" checked={f.alojado} onChange={e => set('alojado', e.target.checked)} /> Alojado</label>
            </div>
            <div className="status-preview">Liberação: <Pill cls={st === 'Liberado' ? 'p-good' : 'p-warn'}>{st}</Pill>{st !== 'Liberado' && <span className="muted"> ({[!f.aso && 'falta ASO', !f.trein && 'falta treinamento'].filter(Boolean).join(' e ')})</span>}</div>
          </div>
          {f.alojado && <div className="field full"><label className="flabel" htmlFor="f-aloj">Nome do alojamento</label><input id="f-aloj" list="dl-aloj" value={f.alojamento} onChange={e => set('alojamento', e.target.value)} autoComplete="off" />
            <datalist id="dl-aloj">{alojs.map(x => <option key={x} value={x} />)}</datalist></div>}
          <div className="field full"><label className="flabel" htmlFor="f-obs">Observações</label><textarea id="f-obs" rows="2" value={f.obs} onChange={e => set('obs', e.target.value)} /></div>
          {erro && <div className="err">{erro}</div>}
        </div>
        <div className="dlg-f">
          <div>{id && <button type="button" className="btn danger" onClick={excluir}>{armado ? 'Confirmar exclusão' : 'Excluir colaborador'}</button>}</div>
          <div><button type="button" className="btn" onClick={onClose}>Cancelar</button><button type="submit" className="btn primary" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button></div>
        </div>
      </form>
    </Dialog>
  )
}
