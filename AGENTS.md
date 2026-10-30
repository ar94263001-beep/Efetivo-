# Efetivo de Obras

App de um arquivo só (`index.html`) para controlar efetivo, ponto diário de colaboradores e máquinas, alojamento e liberação (ASO + treinamento) das obras Terras 6, Comercial 7 e 8 e Avenida Báltico.

## Como funciona hoje

- **Sem servidor e sem banco online.** Abre com dois cliques no navegador.
- **Os dados ficam em dois lugares:** dentro do próprio arquivo (bloco `<script type="application/json" id="snap">`) e numa cópia no navegador (`localStorage`, chave `efetivoV3-obras-dados`). Vale a versão mais recente (`salvoEm`).
- **"Salvar arquivo atualizado"** baixa um `.html` novo com os dados de agora dentro. **"Abrir arquivo salvo"** carrega os dados de um `.html` baixado antes.
- `DB` imita a interface do Firestore (`collection().onSnapshot`, `doc().update/set/delete`). As coleções são `colaboradores`, `maquinas`, `ponto/<data>` e `pontoMaq/<data>`. Ao migrar para um banco de verdade, troque só esse objeto.
- A única biblioteca externa é o SheetJS (xlsx 0.18.5), usado na exportação para o Power BI.

## Regras

- Quando atualizar os dados do arquivo base, mantenha `salvoEm` mais novo que o anterior. Senão a cópia do navegador ganha.
- Nunca apague dados em refatoração.
- Antes de entregar uma mudança: abra o `index.html`, confira que o console está sem erro e passe por todas as abas.
