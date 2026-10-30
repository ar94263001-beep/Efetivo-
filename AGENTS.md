# Efetivo de Obras

Controle de efetivo, liberação (ASO + treinamento), alojamento, ponto diário de colaboradores e máquinas, painel e apresentação para a diretoria, das obras da empresa. Quem usa é o escritório e quem lança o ponto nas obras.
React + Vite + Supabase + Vercel, e uma biblioteca só no app (`@supabase/supabase-js`). Um perfil só: quem tem login aprovado vê e altera tudo (shell em `src/pages/AppPrincipal.jsx`). Login com cadastro aberto e aprovação na aba Equipe.

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
- A obra é a entidade que se repete: toda tabela de lançamento tem `obra_id`, e obra nova se cria na aba Equipe (ou ao digitar "+ Nova obra" nos formulários). Não existe acesso por obra: decisão de 29/10/2026 (ver `BRIEFING.md`).

## Modo de teste

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env.local`, o app roda com os dados de `src/lib/mockData.js` (os mesmos do arquivo antigo em `legado/`), guardados no navegador. Uma faixa amarela no topo avisa.

## A régua

`npm run check` = build + lint + testes (`tests/*.mjs`). Fecha **em zero**, sempre. Rode no fim de toda mudança. Todo bug corrigido em `src/lib/` nasce com teste junto. Check verde não prova que a tela funciona: abra e olhe.

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, políticas RLS ou migrations → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) **antes** do push.

## Armadilhas

- No Windows, use `npm.cmd` / `npx.cmd` se o PowerShell bloquear o `npm.ps1`.
- O Supabase devolve no máximo 1000 linhas por consulta: `dados.js` pagina com `todas()`. Ponto de um mês passa disso.
- Desde 30/05/2026 tabela nova não abre sozinha: toda migration escreve `grant ... to authenticated`. Nunca `grant all` nem liberar para `anon`.
- Datas: `isoOf()` em `regras.js`, nunca `toISOString().split('T')[0]` (pula um dia no fuso do Brasil).
