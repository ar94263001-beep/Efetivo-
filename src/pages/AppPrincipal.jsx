import { useMemo, useState } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import { usePref } from '../lib/usePref.js'
import { USAR_MOCK, ACESSO_LIVRE } from '../lib/dados.js'
import { exportarPowerBI } from '../lib/exportar.js'
import { M_SIT, filtrarPessoas } from '../lib/regras.js'
import { useToast } from '../components/index.jsx'
import Apresentacao from '../screens/apresentacao.jsx'
import Painel from '../screens/painel.jsx'
import Colaboradores from '../screens/colaboradores.jsx'
import Ponto from '../screens/ponto.jsx'
import Maquinas from '../screens/maquinas.jsx'
import Qualidade from '../screens/qualidade.jsx'
import KitPowerBI from '../screens/powerbi.jsx'
import Equipe from '../screens/equipe.jsx'

const ABAS = [['apres', 'Apresentação'], ['painel', 'Painel'], ['pessoas', 'Colaboradores'], ['ponto', 'Controle de ponto'], ['maq', 'Máquinas'], ['dados', 'Qualidade dos dados'], ['pbi', 'Kit Power BI'], ['equipe', ACESSO_LIVRE ? 'Obras' : 'Equipe']]
const DEF = { obra: '', sit: 'Ativo', status: '', pend: '', aloj: '', alojNome: '', func: '', q: '' }
const MF_DEF = { tipo: '', sit: '', op: '', q: '' }
const ordenar = arr => [...new Set(arr)].sort((a, b) => a.localeCompare(b, 'pt-BR'))

export default function AppPrincipal({ perfil, onSair }) {
  const { carregando, erro, obrasNomes, people, machines, D, reload } = useDados()
  const toast = useToast()
  const [aba, setAba] = usePref('efetivo-aba', 'apres')
  const [F, setF] = usePref('efetivo-filtros', DEF)
  const [MF, setMF] = usePref('efetivo-filtros-maq', MF_DEF)
  const [exportando, setExportando] = useState(false)
  const P = useMemo(() => filtrarPessoas(people, F), [people, F])
  const set = k => e => setF({ ...F, [k]: e.target.value })
  const setM = k => e => setMF({ ...MF, [k]: e.target.value })
  const funcs = useMemo(() => ordenar(people.map(p => p.funcao).filter(Boolean)), [people])
  const alojs = useMemo(() => ordenar(people.filter(p => p.alojado && p.alojamento).map(p => p.alojamento)), [people])
  const tipos = useMemo(() => ordenar(machines.map(x => x.tipo).filter(Boolean)), [machines])
  const comFiltros = ['painel', 'pessoas', 'maq', 'ponto'].includes(aba)

  async function exportar() {
    setExportando(true)
    try { await exportarPowerBI(D); toast('Arquivo salvo. No Power BI, clique em Atualizar.') }
    catch (e) { toast(e.message) }
    setExportando(false)
  }

  let corpo
  if (erro) corpo = <div className="notice">Não foi possível carregar os dados: {erro} <button className="btn small" onClick={reload}>Tentar de novo</button></div>
  else if (carregando) corpo = <div className="notice">Carregando colaboradores…</div>
  else switch (aba) {
    case 'painel': corpo = <Painel P={P} F={F} />; break
    case 'pessoas': corpo = <Colaboradores P={P} F={F} />; break
    case 'ponto': corpo = <Ponto F={F} />; break
    case 'maq': corpo = <Maquinas F={F} MF={MF} />; break
    case 'dados': corpo = <Qualidade />; break
    case 'pbi': corpo = <KitPowerBI onExportar={exportar} exportando={exportando} />; break
    case 'equipe': corpo = <Equipe perfil={perfil} />; break
    default: corpo = <Apresentacao />
  }

  return (
    <div className={aba === 'ponto' ? 'wrap larga' : 'wrap'}>
      {USAR_MOCK && <div className="mockbar">Modo de teste: dados de exemplo, nada vai para o banco. As alterações ficam só neste navegador.</div>}
      <header className="top">
        <div>
          <div className="eyebrow">{obrasNomes.join(' · ')}</div>
          <h1>Efetivo de Obras</h1>
        </div>
        <div className="meta">
          <span className="sync ok"><i></i><span>{ACESSO_LIVRE ? '' : `${perfil.nome || perfil.email} · `}{people.length} colaboradores</span></span>
          <div className="acoes">
            <button className="btn" onClick={exportar} disabled={exportando || carregando}>{exportando ? 'Gerando…' : 'Exportar para Power BI'}</button>
            {!ACESSO_LIVRE && <button className="btn" onClick={onSair}>Sair</button>}
          </div>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {ABAS.map(([k, n]) => <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)}>{n}</button>)}
      </nav>

      {comFiltros && !carregando && !erro && <div className="filters">
        <div className="frow"><span className="flabel">Obra</span><div className="chips">
          {['', ...obrasNomes].map(o => <button key={o} className="chip" aria-pressed={o === F.obra} onClick={() => setF({ ...F, obra: o })}>{o || 'Todas'}</button>)}
        </div></div>
        {(aba === 'painel' || aba === 'pessoas') && <div className="frow">
          <label className="sel">Situação <select value={F.sit} onChange={set('sit')}><option value="Ativo">Ativos</option><option value="Desligado">Desligados</option><option value="">Todos</option></select></label>
          <label className="sel">Liberação <select value={F.status} onChange={set('status')}><option value="">Todos</option><option>Liberado</option><option>Pendente</option></select></label>
          <label className="sel">Pendência <select value={F.pend} onChange={set('pend')}><option value="">Qualquer</option><option value="aso">Sem ASO</option><option value="trein">Sem treinamento</option><option value="adm">Sem data de admissão</option></select></label>
          <label className="sel">Alojado <select value={F.aloj} onChange={set('aloj')}><option value="">Todos</option><option value="1">Sim</option><option value="0">Não</option></select></label>
          <label className="sel">Alojamento <select value={alojs.includes(F.alojNome) ? F.alojNome : ''} onChange={set('alojNome')}><option value="">Todos</option>{alojs.map(a => <option key={a}>{a}</option>)}</select></label>
          <label className="sel">Função <select value={funcs.includes(F.func) ? F.func : ''} onChange={set('func')}><option value="">Todas</option>{funcs.map(a => <option key={a}>{a}</option>)}</select></label>
          <input type="search" value={F.q} onChange={set('q')} placeholder="Buscar nome ou função" aria-label="Buscar colaborador" />
          <button className="linkbtn" onClick={() => setF({ ...DEF })}>Limpar filtros</button>
        </div>}
        {aba === 'maq' && <div className="frow">
          <label className="sel">Tipo <select value={MF.tipo} onChange={setM('tipo')}><option value="">Todos</option>{tipos.map(a => <option key={a}>{a}</option>)}</select></label>
          <label className="sel">Situação <select value={MF.sit} onChange={setM('sit')}><option value="">Todas</option>{M_SIT.map(a => <option key={a}>{a}</option>)}</select></label>
          <label className="sel">Operador <select value={MF.op} onChange={setM('op')}><option value="">Todos</option><option value="com">Com operador cadastrado</option><option value="sem">Sem operador cadastrado</option></select></label>
          <input type="search" value={MF.q} onChange={setM('q')} placeholder="Buscar máquina ou responsável" aria-label="Buscar máquina" />
          <button className="linkbtn" onClick={() => setMF({ ...MF_DEF })}>Limpar filtros</button>
        </div>}
      </div>}

      {corpo}
    </div>
  )
}
