# Efetivo de Obras

Controle de efetivo, liberação (ASO + treinamento), alojamento, ponto diário de colaboradores e máquinas, painel e apresentação para a diretoria, das obras da empresa. Quem usa é o escritório e quem lança o ponto nas obras.
React + Vite + Supabase + Vercel, e uma biblioteca só no app (`@supabase/supabase-js`). **Acesso livre por decisão de quem é responsável pelo app (30/10/2026): sem login, quem tem o link vê e altera tudo** (`ACESSO_LIVRE` em `src/lib/dados.js`). O login com aprovação está pronto, desligado; os passos para ligar estão no topo da migration. Shell em `src/pages/AppPrincipal.jsx`.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/regras.js`** (ou outro `src/lib/*.js`). Regra pura: horas, liberação, operador do dia, filtros, inconsistências. Sem React, sem banco, sem `window`. Import com `.js` explícito. É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface e layout. A tela pede a decisão à lib.
- `src/lib/dados.js`: **única porta do banco.** Nenhuma tela chama o Supabase direto. Ele converte as linhas do banco para o formato do app (obra pelo nome, `ponto[data][colaboradorId]`) e tem o modo de teste embutido.
- `src/lib/DadosContext.jsx`: estado compartilhado e as ações de gravar (atualiza a tela na hora e desfaz se o banco recusar).
- `src/lib/exportar.js`: CSV e o Excel do Power BI. O SheetJS é baixado do cdnjs só no clique; não é dependência do app.

Consequências: `if` de negócio dentro de tela vai para `lib`. Constantes (status do ponto, situações, tipos) têm dono único em `regras.js`.

## Semânticas que não se veem olhando

- No ponto, `maq` **ausente** = segue o cadastro de máquinas; `''` = "nenhuma", escolhido de propósito. No banco: `maquina_definida`.
- Na máquina, `op` ausente = automático (ponto dos colaboradores > cadastro); `''` = nenhum; `'__cad'` = nome do cadastro que não está na lista. No banco: `operador_modo`.
- `obra` vazia num lançamento = a obra do cadastro. Só se grava a obra quando ela é diferente.
- A obra é a entidade que se repete: toda tabela de lançamento tem `obra_id`, e obra nova se cria na aba Obras (ou ao digitar "+ Nova obra" nos formulários). Não existe acesso por obra: decisão de 29/10/2026 (ver `BRIEFING.md`).

## Salvar dia, histórico e espelho

- Os lançamentos gravam na hora. O botão "Salvar dia" não grava o ponto: marca o dia em `dias_salvos` (por obra e por folha) e abre o dia seguinte.
- `src/lib/espelho.js` monta o espelho e o histórico; `src/lib/espelhoXlsx.js` desenha o Excel no modelo do "Espelho de Pontos" (ExcelJS do cdnjs, só no clique; logo em `public/logo-espelho.png`).
- Regras do espelho: domingo 110%, outros dias 60%; a célula mostra o número de horas extras no lugar de P; jornada seg–qui 9h, sexta 8h, fim de semana tudo extra. Feriado não é reconhecido: ajusta-se a linha HORA EXTRA(%) no Excel.
- A legenda do modelo trocou EC por FE e a linha OBRA por FJ, que são códigos que o app usa.

## Banco

No ar em https://efetivo-obra01.vercel.app (Vercel, projeto `efetivo-obra01`): todo push na `main` publica sozinho. Projeto Supabase `efetivo-de-obras` (`mzboucinaxkhtxgvlqny`). Todo SQL vira arquivo em `supabase/migrations/`. Depois de migration, atualize `tests/_schema-snapshot.json`. `scripts/seed.mjs` carregou os dados iniciais e não regrava se já houver dados.

## Modo de teste

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env.local`, o app roda com os dados de `src/lib/mockData.js` (os mesmos do arquivo antigo em `legado/`), guardados no navegador. Uma faixa amarela no topo avisa.

## A régua

`npm run check` = build + lint + testes (`tests/*.mjs`). Fecha **em zero**, sempre. Rode no fim de toda mudança. Todo bug corrigido em `src/lib/` nasce com teste junto. Check verde não prova que a tela funciona: abra e olhe.

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, políticas RLS ou migrations → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) **antes** do push.

## Armadilhas

- No Windows, use `npm.cmd` / `npx.cmd` se o PowerShell bloquear o `npm.ps1`.
- O Supabase devolve no máximo 1000 linhas por consulta: `dados.js` pagina com `todas()`. Ponto de um mês passa disso.
- Desde 30/05/2026 tabela nova não abre sozinha: toda migration escreve `grant ... to authenticated`. Nunca `grant all`. A liberação para `anon` existe só por causa do acesso livre e está marcada na migration; tabela nova segue a mesma decisão enquanto ela valer.
- Datas: `isoOf()` em `regras.js`, nunca `toISOString().split('T')[0]` (pula um dia no fuso do Brasil).
