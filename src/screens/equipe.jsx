import { useEffect, useState } from 'react'
import { useDados } from '../lib/DadosContext.jsx'
import { listarUsuarios, aprovarUsuario, ACESSO_LIVRE } from '../lib/dados.js'
import { Pill, useToast } from '../components/index.jsx'

export default function Equipe({ perfil }) {
  const { obras, people, machines, salvarObra } = useDados()
  const toast = useToast()
  const [usuarios, setUsuarios] = useState(null)
  const [nova, setNova] = useState('')

  async function carregar() {
    const r = await listarUsuarios()
    if (r.erro) { toast(r.erro); setUsuarios([]); return }
    setUsuarios(r.data)
  }
  useEffect(() => { if (!ACESSO_LIVRE) carregar() }, [])

  async function mudar(u, aprovado) {
    if (u.id === perfil.id && !aprovado) return toast('Você não pode tirar o seu próprio acesso.')
    const r = await aprovarUsuario(u.id, aprovado)
    if (r.erro) return toast(r.erro)
    toast(aprovado ? `${u.nome || u.email} aprovado` : `Acesso de ${u.nome || u.email} removido`)
    carregar()
  }
  async function criarObra(e) {
    e.preventDefault()
    const nome = nova.trim().replace(/\s+/g, ' ')
    if (!nome) return
    if (obras.some(o => o.nome.toLowerCase() === nome.toLowerCase())) return toast('Essa obra já existe.')
    const r = await salvarObra({ nome })
    if (!r.erro) { toast(`Obra ${nome} criada`); setNova('') }
  }

  const pendentes = (usuarios || []).filter(u => !u.aprovado)
  return (
    <section className="grid">
      {!ACESSO_LIVRE && <div className="panel">
        <h2>Logins</h2>
        <div className="sub">Quem cria conta só entra depois de aprovado aqui. {pendentes.length ? `${pendentes.length} aguardando.` : ''}</div>
        {usuarios === null ? <p className="count">Carregando…</p> :
          <div className="tablewrap"><table><thead><tr><th>Pessoa</th><th>Situação</th><th></th></tr></thead><tbody>
            {[...pendentes, ...usuarios.filter(u => u.aprovado)].map(u => <tr key={u.id}>
              <td style={{ whiteSpace: 'normal' }}><b>{u.nome || '—'}</b><div className="muted" style={{ fontSize: 12 }}>{u.email}</div></td>
              <td>{u.aprovado ? <Pill cls="p-good">Aprovado</Pill> : <Pill cls="p-warn">Aguardando</Pill>}</td>
              <td>{u.aprovado ? <button className="btn small" onClick={() => mudar(u, false)} disabled={u.id === perfil.id}>Remover acesso</button>
                : <button className="btn small primary" onClick={() => mudar(u, true)}>Aprovar</button>}</td>
            </tr>)}
          </tbody></table></div>}
      </div>}
      <div className="panel">
        <h2>Obras</h2>
        <div className="sub">Obra nova aparece em todas as telas na hora. Obra encerrada some das listas de escolha, mas o histórico fica.</div>
        <form onSubmit={criarObra} style={{ display: 'flex', gap: 8, margin: '6px 0 12px', flexWrap: 'wrap' }}>
          <input value={nova} onChange={e => setNova(e.target.value)} placeholder="Nome da nova obra" aria-label="Nome da nova obra" style={{ flex: '1 1 180px' }} />
          <button className="btn primary" type="submit">+ Criar obra</button>
        </form>
        <div className="tablewrap"><table><thead><tr><th>Obra</th><th className="num">Colab.</th><th className="num">Máq.</th><th></th></tr></thead><tbody>
          {[...obras].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(o => <tr key={o.id} className={o.ativa === false ? 'off' : ''}>
            <td>{o.nome}</td>
            <td className="num">{people.filter(p => p.obra === o.nome && p.situacao !== 'Desligado').length}</td>
            <td className="num">{machines.filter(m => m.obra === o.nome).length}</td>
            <td><button className="btn small" onClick={() => salvarObra({ ...o, ativa: o.ativa === false })}>{o.ativa === false ? 'Reabrir' : 'Encerrar'}</button></td>
          </tr>)}
        </tbody></table></div>
      </div>
    </section>
  )
}
