import { useDados } from '../lib/DadosContext.jsx'
import { problemasDados } from '../lib/regras.js'
import { Alerts } from '../components/index.jsx'

const ORIGEM = [
  ['p-warn', 'Origem', 'Dados da planilha RELAÇÃO DAS MÁQUINAS R02:', '58 colaboradores (43 Terras 6 · 15 Comercial 7 e 8) e 38 máquinas (28 Terras 6 · 10 Comercial 7 e 8).'],
  ['p-warn', 'Obra', 'Avenida Báltico criada como obra própria,', 'com os 15 colaboradores da Comercial 7 e 8 duplicados. As máquinas continuam cadastradas na Comercial 7 e 8.'],
  ['p-warn', 'Texto', 'Obras arrastadas no Excel:', '"COMERCIAL 7 E 9" até "7 E 16" foram tratadas como Comercial 7 e 8, e "TERRAS7"/"TERRAS8" (2 pipas terceirizados) como Terras 6.'],
  ['p-warn', 'Campos', 'A planilha não traz ASO, treinamento, admissão nem alojamento.', 'Todos entram como Pendente e não alojados até serem preenchidos em Colaboradores › Editar.'],
]

export default function Qualidade() {
  const { people, machines, obrasNomes } = useDados()
  return (
    <section>
      <div className="panel doc">
        <h2>Qualidade dos dados</h2>
        <div className="sub">Verificação automática do banco atual. Atualiza a cada alteração.</div>
        <Alerts items={problemasDados(people, machines, obrasNomes)} vazio="Nenhuma inconsistência encontrada." />
        <h3>Na planilha original</h3>
        <Alerts items={ORIGEM} />
      </div>
    </section>
  )
}
