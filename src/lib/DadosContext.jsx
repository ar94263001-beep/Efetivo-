import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as dados from './dados.js'
import { enrich, mesclarPonto, hojeISO, montarD } from './regras.js'
import { useToast } from '../components/index.jsx'

const Ctx = createContext(null)
export const useDados = () => useContext(Ctx)

const semMes = (obj, mes) => Object.fromEntries(Object.entries(obj).filter(([d]) => !d.startsWith(mes)))

// Carrega cadastros + ponto dos meses abertos, e oferece as ações de gravar.
// Toda gravação atualiza a tela na hora e desfaz se o banco recusar.
export function DadosProvider({ children }) {
  const toast = useToast()
  const [obras, setObras] = useState([])
  const [people, setPeopleSt] = useState([])
  const [machines, setMachinesSt] = useState([])
  const [ponto, setPontoSt] = useState({})
  const [pontoM, setPontoMSt] = useState({})
  const [salvos, setSalvos] = useState([])
  const [climas, setClimas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const meses = useRef(new Set())
  const R = useRef({ people: [], machines: [], ponto: {}, pontoM: {} })
  const setPeople = fn => { R.current.people = fn(R.current.people); setPeopleSt(R.current.people) }
  const setMachines = fn => { R.current.machines = fn(R.current.machines); setMachinesSt(R.current.machines) }
  const setPonto = fn => { R.current.ponto = fn(R.current.ponto); setPontoSt(R.current.ponto) }
  const setPontoM = fn => { R.current.pontoM = fn(R.current.pontoM); setPontoMSt(R.current.pontoM) }

  async function carregarMes(mes, forcar) {
    if (!mes || (!forcar && meses.current.has(mes))) return
    meses.current.add(mes)
    const r = await dados.carregarPonto(mes)
    if (r.erro) { meses.current.delete(mes); toast(r.erro); return }
    setPonto(p => ({ ...semMes(p, mes), ...r.data.ponto }))
    setPontoM(p => ({ ...semMes(p, mes), ...r.data.pontoM }))
    setSalvos(l => [...l.filter(x => !x.data.startsWith(mes)), ...r.data.salvos])
    setClimas(l => [...l.filter(x => !x.data.startsWith(mes)), ...r.data.climas])
  }
  async function reload() {
    const r = await dados.carregarCadastros()
    if (r.erro) { setErro(r.erro); setCarregando(false); return }
    setErro('')
    setObras(r.data.obras)
    setPeople(() => r.data.colaboradores.map(enrich))
    setMachines(() => r.data.maquinas)
    await Promise.all([...meses.current].map(m => carregarMes(m, true)))
    setCarregando(false)
  }
  useEffect(() => {
    meses.current.add(hojeISO().slice(0, 7))
    reload()
    // quem volta para a aba vê o que os colegas lançaram enquanto isso
    const aoVoltar = () => { if (document.visibilityState === 'visible') reload() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [])

  async function salvarColaborador(c) {
    const antes = R.current.people
    if (c.id) setPeople(ps => ps.map(p => p.id === c.id ? enrich({ ...p, ...c }) : p))
    const r = await dados.salvarColaborador(c)
    if (r.erro) { setPeople(() => antes); toast(r.erro); return r }
    setPeople(ps => c.id ? ps.map(p => p.id === c.id ? enrich({ ...p, ...r.data }) : p) : [...ps, enrich(r.data)])
    if (c.obra && !obras.some(o => o.nome === c.obra)) reload()
    return r
  }
  async function excluirColaborador(id) {
    const r = await dados.excluirColaborador(id)
    if (r.erro) { toast(r.erro); return r }
    setPeople(ps => ps.filter(p => p.id !== id))
    return r
  }
  async function salvarMaquina(x) {
    const antes = R.current.machines
    if (x.id) setMachines(ms => ms.map(m => m.id === x.id ? { ...m, ...x } : m))
    const r = await dados.salvarMaquina(x)
    if (r.erro) { setMachines(() => antes); toast(r.erro); return r }
    setMachines(ms => x.id ? ms.map(m => m.id === x.id ? { ...m, ...r.data } : m) : [...ms, r.data])
    if (x.obra && !obras.some(o => o.nome === x.obra)) reload()
    return r
  }
  async function excluirMaquina(id) {
    const r = await dados.excluirMaquina(id)
    if (r.erro) { toast(r.erro); return r }
    setMachines(ms => ms.filter(m => m.id !== id))
    return r
  }
  /* patches = { colaboradorId: mudança }; padrao(id) = { ent, sai, maq } usados ao marcar presença */
  async function lancarPonto(data, patches, padrao) {
    const antes = R.current.ponto[data] || {}, recs = {}
    Object.entries(patches).forEach(([id, patch]) => { recs[id] = mesclarPonto(antes[id], patch, padrao(id)) })
    setPonto(p => ({ ...p, [data]: { ...p[data], ...recs } }))
    const r = await dados.salvarPonto(data, recs)
    if (r.erro) { setPonto(p => ({ ...p, [data]: antes })); toast('Não foi possível gravar o ponto: ' + r.erro) }
    return r
  }
  async function lancarPontoMaq(data, patches) {
    const antes = R.current.pontoM[data] || {}, recs = {}
    Object.entries(patches).forEach(([id, patch]) => { recs[id] = { ...antes[id], ...patch } })
    setPontoM(p => ({ ...p, [data]: { ...p[data], ...recs } }))
    const r = await dados.salvarPontoMaquinas(data, recs)
    if (r.erro) { setPontoM(p => ({ ...p, [data]: antes })); toast('Não foi possível gravar: ' + r.erro) }
    return r
  }
  async function salvarDia(data, tipo, nomes) {
    const r = await dados.salvarDia(data, tipo, nomes)
    if (r.erro) { toast('Não foi possível salvar o dia: ' + r.erro); return r }
    setSalvos(l => [...l.filter(x => !(x.data === data && x.tipo === tipo && nomes.includes(x.obra))), ...nomes.map(obra => ({ data, tipo, obra, salvoEm: new Date().toISOString() }))])
    return r
  }
  async function salvarClima(data, obra, clima) {
    const antes = climas
    setClimas(l => [...l.filter(x => !(x.data === data && x.obra === obra)), { data, obra, clima }])
    const r = await dados.salvarClima(data, obra, clima)
    if (r.erro) { setClimas(antes); toast('Não foi possível gravar o clima: ' + r.erro) }
    return r
  }
  async function salvarObra(o) {
    const r = await dados.salvarObra(o)
    if (r.erro) { toast(r.erro); return r }
    await reload()
    return r
  }

  const D = useMemo(() => montarD({ people, machines, ponto, pontoM }), [people, machines, ponto, pontoM])
  const obrasNomes = useMemo(() => {
    const s = new Set(obras.filter(o => o.ativa !== false).map(o => o.nome))
    people.forEach(p => p.obraParts.forEach(o => s.add(o))); machines.forEach(m => m.obra && s.add(m.obra))
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [obras, people, machines])

  const valor = { obras, obrasNomes, people, machines, ponto, pontoM, salvos, climas, D, carregando, erro, reload, carregarMes,
    salvarColaborador, excluirColaborador, salvarMaquina, excluirMaquina, lancarPonto, lancarPontoMaq, salvarDia, salvarClima, salvarObra }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
