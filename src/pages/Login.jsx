import { useState } from 'react'
import { entrar, cadastrar } from '../lib/dados.js'

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setMsg(null)
    if (modo === 'criar' && !nome.trim()) return setMsg(['err', 'Preencha o seu nome.'])
    if (!email.trim() || !senha) return setMsg(['err', 'Preencha e-mail e senha.'])
    setEnviando(true)
    const r = modo === 'entrar' ? await entrar(email.trim(), senha) : await cadastrar(nome.trim(), email.trim(), senha)
    setEnviando(false)
    if (r.erro) return setMsg(['err', r.erro])
    if (modo === 'criar') setMsg(['ok', 'Conta criada. Se chegar um e-mail de confirmação, abra o link. Depois, alguém da equipe precisa aprovar o seu acesso.'])
  }

  return (
    <div className="login-wrap">
      <form className="login" onSubmit={enviar} noValidate>
        <div className="eyebrow">Controle de obras</div>
        <h1>Efetivo de Obras</h1>
        <div className="seg" role="group" aria-label="Entrar ou criar conta" style={{ margin: '14px 0 4px' }}>
          <button type="button" aria-pressed={modo === 'entrar'} onClick={() => { setModo('entrar'); setMsg(null) }}>Entrar</button>
          <button type="button" aria-pressed={modo === 'criar'} onClick={() => { setModo('criar'); setMsg(null) }}>Criar conta</button>
        </div>
        {modo === 'criar' && <div className="field"><label className="flabel" htmlFor="l-nome">Seu nome</label><input id="l-nome" value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" /></div>}
        <div className="field"><label className="flabel" htmlFor="l-email">E-mail</label><input id="l-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="field"><label className="flabel" htmlFor="l-senha">Senha</label><input id="l-senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} /></div>
        {msg && <p className={msg[0] === 'err' ? 'err' : 'okmsg'}>{msg[1]}</p>}
        <button className="btn primary" type="submit" disabled={enviando}>{enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
        {modo === 'criar' && <p className="count">Depois de criar a conta, você só entra quando alguém da equipe aprovar.</p>}
      </form>
    </div>
  )
}
