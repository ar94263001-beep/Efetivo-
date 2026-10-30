# Briefing — Efetivo de Obras

## O que é
Controle do efetivo das obras: quem está em cada obra, liberação (ASO + treinamento), alojamento, ponto diário de colaboradores e de máquinas, painel e apresentação para a diretoria. Quem usa é o escritório e quem lança o ponto nas obras.

## Perfis de usuário
- **Um perfil só.** Quem tem login aprovado vê e altera tudo, em todas as obras (decisão de 29/10/2026).
- **Cadastro com aprovação:** a pessoa cria a conta e só entra depois que alguém já aprovado liberar, na tela Equipe.

## Módulos (cada um = uma tela)
- Apresentação: slides ao vivo para a diretoria.
- Painel: indicadores, gráficos e pontos de atenção.
- Colaboradores: cadastro, troca de obra, ASO, treinamento e alojamento.
- Controle de ponto: lançamento por dia e por mês, de colaboradores e de máquinas (operador, horímetro).
- Máquinas: cadastro e troca de obra.
- Qualidade dos dados: inconsistências automáticas.
- Kit Power BI: exportação em Excel e medidas DAX.
- Equipe: aprovar logins e cadastrar obras.

## Dado central
Colaborador e o lançamento de ponto diário.

## O segundo
- Entidade que se repete: **obra** (hoje Terras 6, Comercial 7 e 8 e Avenida Báltico).
- Vai existir mais de um? **Sim.** Toda tabela leva a obra, e uma obra nova se abre pela tela Equipe, sem mexer em código.
- Quem vê o quê: **todo mundo aprovado vê todas as obras.** Por isso não existe tabela de acesso por obra. Se um dia o encarregado precisar ver só a obra dele, é aí que ela entra.

## Identidade visual
- Cor principal: âmbar #E8A200 (a mesma do app atual).
- Logo: sem logo por enquanto.

## Fora de escopo (por enquanto)
- Acesso separado por obra e perfis diferentes (diretoria só leitura).
- Atualização ao vivo entre telas abertas: os dados recarregam quando a pessoa volta para a aba.
- Custos de benefícios (café, almoço, janta, combustível): os slides de custo já estavam desligados no app antigo.
