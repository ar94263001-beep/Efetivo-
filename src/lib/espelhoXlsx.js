// Monta o Excel no modelo do "Espelho de Pontos". Recebe o ExcelJS de fora (no navegador vem do cdnjs, só no clique).
const C = { titulo: 'FFFFE699', espelho: 'FFE2EFDA', resumo: 'FFD9E1F2', cinza: 'FFD9D9D9', azulClaro: 'FFB4C6E7', branco: 'FFFFFFFF' }
const LEGENDA = [['P', 'FFB4C6E7', 'PRESENTE'], ['FOLGA', 'FF0070C0', 'FOLGA'], ['N°', 'FFA9D08E', 'QUANTIDADE DE HORAS EXTRAS'], ['F', 'FFFF0000', 'FALTA NÃO JUSTIFICADA'],
  ['A', 'FFFFFF00', 'FALTA JUSTIFICADA C/ ATESTADO'], ['NT', 'FF404040', 'NÃO TRABALHAVA NO PERIODO'], ['OB', 'FF808080', 'OUTRA OBRA'], ['D', 'FF7030A0', 'DEMISSÃO'],
  ['C', 'FF92D050', 'COMPENSAÇÃO'], ['FE', 'FF00B0F0', 'FÉRIAS'], ['FJ', 'FFFFC000', 'FALTA JUSTIFICADA S/ ATESTADO']]
const CORES_DIA = { P: 'FFBDD7EE', FOLGA: 'FF0070C0', F: 'FFFF0000', A: 'FFFFFF00', NT: 'FF595959', OB: 'FF808080', D: 'FF7030A0', C: 'FF00B050', FE: 'FF00B0F0', FJ: 'FFFFC000' }
const LINHAS_MINIMAS = 24
const fina = { style: 'thin', color: { argb: 'FF000000' } }
const borda = { top: fina, left: fina, bottom: fina, right: fina }
const fundo = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const cf = argb => ({ fill: { type: 'pattern', pattern: 'solid', bgColor: { argb } } })
const nomeAba = (obra, sigla) => `${obra} ${sigla}`.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)

function preencher(ws, esp, logoId) {
  const P_DIA = 9, U_COL = 39 // I..AM: sempre 31 colunas, como no modelo
  const larguras = [6.7, 38.7, 19.3, 23.6, 17.4, 16.4, 19.3, 21.1, ...Array(31).fill(6.7), 1.6, 6.7, 6.7, 8.3, 6.7, 9.3, 10.7, 6.4, 25]
  larguras.forEach((w, i) => { ws.getColumn(i + 1).width = w })
  for (let r = 1; r <= 12; r++) ws.getRow(r).height = r === 1 ? 14.4 : 11
  ws.getRow(13).height = 24
  const pequena = { name: 'Calibri', size: 8 }

  ws.getCell('A1').value = 'LEGENDA:'; ws.getCell('A1').font = { ...pequena, bold: true }
  LEGENDA.forEach(([cod, cor, txt], i) => {
    const a = ws.getCell(i + 2, 1), b = ws.getCell(i + 2, 2)
    a.value = cod; a.fill = fundo(cor); a.font = pequena; a.alignment = { horizontal: 'center', vertical: 'middle' }
    b.value = txt; b.font = pequena
  })
  const bloco = (ref, txt, tam, cor) => { ws.mergeCells(ref); const c = ws.getCell(ref.split(':')[0]); c.value = txt; c.font = { name: 'Calibri', size: tam, bold: true }; c.fill = fundo(cor); c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } }
  bloco('C1:G12', 'INFORMAÇÕES DO COLABORADOR', 36, C.titulo)
  bloco('I1:AM10', 'ESPELHO DE PONTO', 72, C.espelho)
  bloco('AO1:AV12', 'RESUMO DE OCORRÊNCIAS', 28, C.resumo)
  if (logoId != null) ws.addImage(logoId, { tl: { col: 7, row: 0 }, br: { col: 8, row: 7 }, editAs: 'oneCell' })
  ;[['H8', `OBRA: ${esp.obra.toUpperCase()}`], ['H9', `MÊS: ${esp.titulo}`], ['H10', 'RESPONSÁVEL:']].forEach(([a, t]) => { const c = ws.getCell(a); c.value = t; c.font = pequena; c.fill = fundo(C.azulClaro); c.alignment = { horizontal: 'left', vertical: 'middle' } })
  ;[['H11', 'DIA DA SEMANA'], ['H12', 'HORA EXTRA(%)']].forEach(([a, t]) => { const c = ws.getCell(a); c.value = t; c.font = { name: 'Calibri', size: 10 }; c.fill = fundo(C.cinza); c.alignment = { horizontal: 'right', vertical: 'middle' }; c.border = { right: fina } })

  for (let i = 0; i < 31; i++) {
    const d = esp.dias[i], col = P_DIA + i
    const a = ws.getCell(11, col), b = ws.getCell(12, col), c = ws.getCell(13, col)
    ;[a, b, c].forEach(x => { x.fill = fundo(C.cinza); x.alignment = { horizontal: 'center', vertical: 'middle' }; x.font = { name: 'Calibri', size: x === c ? 9 : 8 } })
    c.border = { left: fina, top: fina }
    if (!d) continue
    a.value = d.ds + 1 // como o DIA.DA.SEMANA do Excel: 1 = domingo
    b.value = d.pct; b.numFmt = '0%'
    const [y, m] = esp.mes.split('-').map(Number)
    c.value = new Date(Date.UTC(y, m - 1, d.n)); c.numFmt = 'd-mmm'
  }
  ;['N°', 'FUNCIONÁRIO', 'DATA DE NASCIMENTO', 'BAIRRO OU ALOJAMENTO', 'TRANSPORTE', 'TAMANHO BOTA', 'TAMANHO FARDA', 'FUNÇÃO'].forEach((t, i) => {
    const c = ws.getCell(13, i + 1); c.value = t; c.font = { name: 'Calibri', size: i === 7 ? 10 : 8, bold: i < 2 }; c.fill = fundo(C.cinza); c.border = { top: fina, left: fina, right: fina }; c.alignment = { horizontal: i < 2 ? 'center' : 'left', vertical: 'middle', wrapText: true }
  })
  ;['HORAS 60%', 'HORAS 110%', 'ATESTADOS', 'FALTAS', 'LIBERADO', 'AJUDA DE CUSTO', 'PIX', 'OBSERVAÇÕES'].forEach((t, i) => {
    const c = ws.getCell(13, 41 + i); c.value = t; c.font = pequena; c.fill = fundo(C.cinza); c.border = { left: fina, top: fina }; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  const ultima = 13 + Math.max(LINHAS_MINIMAS, esp.linhas.length)
  for (let r = 14; r <= ultima; r++) {
    const l = esp.linhas[r - 14]
    ws.getRow(r).height = 13.2
    for (let col = 1; col <= U_COL; col++) { const c = ws.getCell(r, col); c.font = { ...pequena, bold: col === 1 }; c.border = borda; c.alignment = { horizontal: col >= P_DIA || col === 1 ? 'center' : 'left', vertical: 'middle' } }
    ws.getCell(r, 1).value = l ? l.n : r - 13
    if (l) {
      ws.getCell(r, 2).value = l.nome; ws.getCell(r, 4).value = l.alojamento || null; ws.getCell(r, 8).value = l.funcao
      l.celulas.forEach((v, i) => { if (v !== '') ws.getCell(r, P_DIA + i).value = v })
    }
    const faixa = `I${r}:AM${r}`
    const res = (v) => (l ? v : 0)
    const form = (col, formula, result) => { const c = ws.getCell(r, col); c.value = { formula, result }; c.font = { ...pequena, bold: true }; c.border = borda; c.alignment = { horizontal: 'center', vertical: 'middle' } }
    form(41, `SUMIF($I$12:$AM$12,0.6,${faixa})`, res(l?.h60))
    form(42, `SUMIF($I$12:$AM$12,1.1,${faixa})`, res(l?.h110))
    form(43, `COUNTIF(${faixa},$A$6)`, res(l?.atestados))
    form(44, `COUNTIF(${faixa},$A$5)`, res(l?.faltas))
    for (let col = 45; col <= 48; col++) { const c = ws.getCell(r, col); c.font = pequena; c.border = borda; c.alignment = { horizontal: col === 48 ? 'left' : 'center', vertical: 'middle' } }
    if (l && l.obs) ws.getCell(r, 48).value = l.obs
  }
  let prioridade = 1
  const regra = o => ({ priority: prioridade++, ...o })
  ws.addConditionalFormatting({ ref: `I14:AM${ultima}`, rules: [
    ...Object.entries(CORES_DIA).map(([cod, cor]) => regra({ type: 'cellIs', operator: 'equal', formulae: [`"${cod}"`], style: cf(cor) })),
    regra({ type: 'cellIs', operator: 'greaterThan', formulae: ['0'], style: cf('FFA9D08E') }),
  ] })
  ws.addConditionalFormatting({ ref: 'I11:AM11', rules: [
    regra({ type: 'cellIs', operator: 'equal', formulae: ['7'], style: cf('FFFFFF00') }),
    regra({ type: 'cellIs', operator: 'equal', formulae: ['1'], style: cf('FFFF0000') }),
    regra({ type: 'cellIs', operator: 'between', formulae: ['2', '6'], style: cf('FF92D050') }),
  ] })
  ws.addConditionalFormatting({ ref: `AO14:AR${ultima}`, rules: [regra({ type: 'cellIs', operator: 'greaterThan', formulae: ['0'], style: cf('FF92D050') })] })
}

/* espelhos = [{ mes, obra, dias, linhas, titulo }]; sigla = 'OUT 2026'; logo = ArrayBuffer do PNG ou null */
export function construirPlanilha(ExcelJS, espelhos, sigla, logo) {
  const wb = new ExcelJS.Workbook()
  const logoId = logo ? wb.addImage({ buffer: logo, extension: 'png' }) : null
  espelhos.forEach(esp => {
    const ws = wb.addWorksheet(nomeAba(esp.obra, sigla), {
      views: [{ state: 'frozen', xSplit: 8, ySplit: 13, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    })
    preencher(ws, esp, logoId)
  })
  return wb
}
