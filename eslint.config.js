import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Sem esta regra, o no-unused-vars não enxerga identificadores usados
      // dentro do JSX e acusa como "nunca usado" praticamente todo componente
      // importado — o que torna o lint inútil para achar código morto.
      'react/jsx-uses-vars': 'error',
      // `catch (_) {}` e parâmetros iniciados por _ são ignorados de propósito.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // ─────────────────────────────────────────────────────────────────────
      // O eslint-plugin-react-hooks 7 trouxe as regras do compilador do React,
      // e é essa versão que o npm instala com "latest". Elas acusam padrões que
      // são CORRETOS neste stack: sem as três linhas abaixo, o app dela reprova
      // no primeiro `npm run check` sem ela ter feito nada errado.
      // Se precisar religar alguma para caçar um bug, religue, resolva e desligue
      // de novo — o que não pode é a saída do check ficar suja.

      // Acusa qualquer setState dentro de efeito. Só que "buscar os dados ao
      // abrir a tela" e "limpar o formulário quando a folha fecha" são feitos
      // exatamente assim quando não se usa biblioteca de dados — e aqui não se
      // usa, de propósito, para o código seguir legível para quem não programa.
      'react-hooks/set-state-in-effect': 'off',

      // Só afeta o recarregamento a quente durante o desenvolvimento: um arquivo
      // que exporta uma constante ao lado do componente perde o fast refresh.
      // Não afeta em nada o app publicado.
      'react-refresh/only-export-components': 'off',

      // Pede toda variável usada dentro do efeito na lista de dependências.
      // Incluir a função de carregar, que nasce de novo a cada render, põe o
      // efeito em laço infinito. Lista curta aqui é decisão, não esquecimento.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])
