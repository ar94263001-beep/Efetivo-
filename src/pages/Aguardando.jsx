export default function Aguardando({ perfil, onRecarregar, onSair }) {
  return (
    <div className="login-wrap">
      <div className="login">
        <div className="eyebrow">Efetivo de Obras</div>
        <h1>Aguardando aprovação</h1>
        <p>Sua conta ({perfil.email}) foi criada. Peça para alguém da equipe aprovar o seu acesso na aba <b>Equipe</b>.</p>
        <p className="count">Depois da aprovação, clique em "Já fui aprovado".</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={onRecarregar}>Já fui aprovado</button>
          <button className="btn" onClick={onSair}>Sair</button>
        </div>
      </div>
    </div>
  )
}
