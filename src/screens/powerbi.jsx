import { useState } from 'react'

const DOBRA = `dObra =
DISTINCT (
    UNION (
        SELECTCOLUMNS ( fColaboradores, "Obra", fColaboradores[Obra] ),
        SELECTCOLUMNS ( fMaquinas, "Obra", fMaquinas[Obra] )
    )
)`
const DAX = `Efetivo Total = COUNTROWS ( fColaboradores )

Efetivo Ativo =
CALCULATE ( [Efetivo Total], fColaboradores[Situacao] = "Ativo" )

Liberados =
CALCULATE ( [Efetivo Ativo], fColaboradores[Status] = "Liberado" )

Pendentes = [Efetivo Ativo] - [Liberados]

% Liberados = DIVIDE ( [Liberados], [Efetivo Ativo] )

Alojados =
CALCULATE ( [Efetivo Ativo], fColaboradores[Alojado] = "SIM" )

Nao Alojados = [Efetivo Ativo] - [Alojados]

-- ponto (tabela fPonto do Excel exportado)
Presencas = CALCULATE ( COUNTROWS ( fPonto ), fPonto[Lancamento] = "P" )

Faltas = CALCULATE ( COUNTROWS ( fPonto ), fPonto[Lancamento] = "F" )

% Presenca = DIVIDE ( [Presencas], COUNTROWS ( fPonto ) )

Qtd Maquinas = COUNTROWS ( fMaquinas )`

function Codigo({ texto }) {
  const [rot, setRot] = useState('Copiar')
  const copiar = () => navigator.clipboard.writeText(texto).then(() => setRot('Copiado'), () => setRot('Selecione e copie')).finally(() => setTimeout(() => setRot('Copiar'), 1500))
  return <div className="codebox"><button className="btn small copy" onClick={copiar}>{rot}</button><pre>{texto}</pre></div>
}

export default function KitPowerBI({ onExportar, exportando }) {
  return (
    <section>
      <div className="doc">
        <p className="muted">Tudo que você precisa para recriar este painel no Power BI Desktop.</p>
        <p><button className="btn primary" onClick={onExportar} disabled={exportando}>{exportando ? 'Gerando…' : 'Baixar Excel para o Power BI'}</button></p>
        <h3>1. Dados e fontes</h3>
        <p>Em <i>Obter dados → Excel</i>, abra o arquivo <b>Efetivo_PowerBI.xlsx</b> e marque as tabelas fColaboradores, fMaquinas, fPonto e fPontoMaquinas. Para atualizar, baixe de novo por cima do mesmo arquivo e clique em <i>Atualizar</i> no Power BI.</p>
        <h3>2. Modelagem</h3>
        <div className="model"><div className="tbl"><div className="h">dObra</div><div>Obra (1)</div></div><span className="arrow">1 ──── *</span>
          <div className="tbl"><div className="h">fColaboradores</div><div>ID · Colaborador</div><div>Funcao · Obra (*)</div><div>Situacao · Status</div><div>Alojado · Alojamento</div></div></div>
        <div className="model"><div className="tbl"><div className="h">dObra</div><div>Obra (1)</div></div><span className="arrow">1 ──── *</span>
          <div className="tbl"><div className="h">fMaquinas</div><div>Tipo · Item</div><div>Responsavel · Obra (*)</div></div></div>
        <Codigo texto={DOBRA} />
        <h3>3. Medidas DAX</h3>
        <Codigo texto={DAX} />
        <h3>4. Visuais sugeridos</h3>
        <ul>
          <li><b>Cartões:</b> Efetivo Ativo, % Liberados, Presentes hoje, Qtd Máquinas.</li>
          <li><b>Barras empilhadas horizontais:</b> eixo dObra[Obra], valores Liberados e Pendentes.</li>
          <li><b>Barras empilhadas:</b> fPonto por data e lançamento (P, F, FJ, AT, FG, FE).</li>
          <li><b>Barras:</b> fColaboradores[Alojamento] × Efetivo Total, filtrando Alojado = "SIM".</li>
          <li><b>Segmentações:</b> Obra, Situação, Status, Alojado e Função no topo da página.</li>
        </ul>
        <h3>5. Documentação</h3>
        <p>Liberado = ASO e treinamento OK. Ponto diário: P presente, F falta, FJ falta justificada, AT atestado, FG folga, FE férias, OB outra obra, NT não trabalhava no período, D demissão, C compensação, EC em fase de contratação. Máquinas: OP operando, PS parada sem serviço, SO sem operador, QB quebrada, MN manutenção, CH chuva.</p>
      </div>
    </section>
  )
}
