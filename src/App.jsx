import { useEffect, useState } from 'react'
import { sessaoAtual, ouvirSessao, meuPerfil, sair } from './lib/dados.js'
import { DadosProvider } from './lib/DadosContext.jsx'
import { ToastProvider } from './components/index.jsx'
import Login from './pages/Login.jsx'
import Aguardando from './pages/Aguardando.jsx'
import AppPrincipal from './pages/AppPrincipal.jsx'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [perfil, setPerfil] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    sessaoAtual().then(r => setSession(r.data || null))
    return ouvirSessao(s => setSession(s))
  }, [])

  async function carregarPerfil() {
    if (!session) { setPerfil(null); return }
    const r = await meuPerfil(session.user.id)
    if (r.erro) setErro(r.erro)
    setPerfil(r.data || { id: session.user.id, email: session.user.email, aprovado: false })
  }
  useEffect(() => { carregarPerfil() }, [session?.user?.id])

  let tela
  if (session === undefined) tela = <div className="notice" style={{ margin: 24 }}>Carregando…</div>
  else if (!session) tela = <Login />
  else if (!perfil) tela = <div className="notice" style={{ margin: 24 }}>{erro || 'Carregando seu perfil…'}</div>
  else if (!perfil.aprovado) tela = <Aguardando perfil={perfil} onRecarregar={carregarPerfil} onSair={sair} />
  else tela = <DadosProvider><AppPrincipal perfil={perfil} onSair={sair} /></DadosProvider>
  return <ToastProvider>{tela}</ToastProvider>
}
