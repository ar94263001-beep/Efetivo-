// Monta o Excel do RDO: uma aba por dia, no layout do Relatório Diário de Obra.
const fina = { style: 'thin', color: { argb: 'FFBFBFBF' } }
const grossa = { style: 'medium', color: { argb: 'FF000000' } }
const fundo = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const CINZA = 'FFBFBFBF', AZUL = 'FF00B0F0', VERDE = 'FF92D050', ROSA = 'FFFFC7CE'
const mono = { name: 'Consolas', size: 9 }
const texto = { name: 'Calibri', size: 8 }
const LINHAS_MINIMAS = 30
// coluna A é margem; B..Q como no modelo
const LARGURAS = [1.5, 10, 36, 9.5, 9.5, 8.5, 8.5, 8.5, 8.5, 28, 33, 13, 8, 8, 8, 8, 8]

function dataExtenso(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function folha(ws, dia, logoId) {
  LARGURAS.forEach((w, i) => { ws.getColumn(i + 1).width = w })
  ws.getRow(1).height = 6; ws.getRow(2).height = 16; ws.getRow(3).height = 16; ws.getRow(4).height = 16; ws.getRow(5).height = 30
  const put = (ref, v, font, al) => { const c = ws.getCell(ref); c.value = v; c.font = font; if (al) c.alignment = al; return c }
  put('B2', 'RELATÓRIO DIÁRIO DE OBRA', { name: 'Consolas', size: 14, bold: true })
  put('B4', 'CLIENTE:', mono); put('C4', dia.obra.toUpperCase(), mono)
  put('H2', 'DATA:', { ...mono, bold: true }, { horizontal: 'right' }); put('I2', dataExtenso(dia.iso), { ...mono, bold: true })
  put('H3', 'CLIMA:', { ...mono, bold: true }, { horizontal: 'right' }); put('I3', dia.clima || '', { ...mono, bold: true })
  put('H4', 'OBRA:', { ...mono, bold: true }, { horizontal: 'right' }); put('I4', dia.obra.toUpperCase(), mono)
  const st = put('L2', dia.validada ? 'VALIDADA' : 'NÃO VALIDADA', { name: 'Calibri', size: 12, bold: true }, { horizontal: 'center', vertical: 'middle' })
  ws.mergeCells('L2:L3'); st.fill = fundo(dia.validada ? VERDE : 'FFFFC000')
  if (logoId != null) ws.addImage(logoId, { tl: { col: 3, row: 1 }, br: { col: 4, row: 4 }, editAs: 'oneCell' })

  const cab = ['PREFIXO EQP.', 'TIPO/MODELO/PLACA', 'HORÍMETRO INICIAL', 'HORÍMETRO FINAL', 'HORAS TRABALHADAS', 'DIESEL L', 'GASOLINA L', 'HORA PARADA', 'OBSERVAÇÕES', 'OPERADOR/MÃO DE OBRA', 'FUNÇÃO', 'HORA ENTRADA', 'HORA SAÍDA', 'H.E 60%', 'H.E 60%', 'H.E 100%']
  cab.forEach((t, i) => { const c = ws.getCell(5, i + 2); c.value = t; c.font = { ...mono, size: 8 }; c.fill = fundo(CINZA); c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } })
  ws.mergeCells('B6:J6'); ws.mergeCells('K6:Q6')
  put('B6', 'EQUIPAMENTOS', { ...texto, bold: true }); put('K6', 'OPERADORES / MÃO DE OBRA', { ...texto, bold: true })
  ws.getCell('B6').fill = fundo(AZUL); ws.getCell('K6').fill = fundo(AZUL)

  const ultima = 6 + Math.max(LINHAS_MINIMAS, dia.linhas.length)
  for (let r = 7; r <= ultima; r++) {
    const l = dia.linhas[r - 7]
    ws.getRow(r).height = 13.2
    for (let col = 2; col <= 17; col++) {
      const c = ws.getCell(r, col); c.font = texto; c.border = { top: fina, bottom: fina, left: col === 11 ? grossa : fina, right: fina }
      c.alignment = { vertical: 'middle', horizontal: [2, 3, 10, 11, 12].includes(col) ? 'left' : 'center' }
    }
    ws.getCell(r, 6).value = { formula: `IF(AND(D${r}<>"",E${r}<>""),E${r}-D${r},"")`, result: l && l.horas != null ? l.horas : '' }
    ws.getCell(r, 6).numFmt = '0.0'
    if (!l) continue
    const vals = { 2: l.prefixo, 3: l.tipo, 4: l.hi, 5: l.hf, 7: l.diesel, 8: l.gasolina, 9: l.parada, 10: l.obs, 11: l.nome, 12: l.funcao, 13: l.entrada, 14: l.saida, 15: l.he60, 17: l.he100 }
    Object.entries(vals).forEach(([col, v]) => { if (v !== '' && v != null) ws.getCell(r, +col).value = v })
    if (dia.repetidos.includes(l.nome)) { const n = ws.getCell(r, 11); n.fill = fundo(ROSA); n.font = { ...texto, color: { argb: 'FF9C0006' } } }
  }
  // contorno do relatório
  for (let col = 2; col <= 17; col++) {
    const a = ws.getCell(2, col), b = ws.getCell(ultima, col)
    a.border = { ...a.border, top: grossa }; b.border = { ...b.border, bottom: grossa }
  }
  for (let r = 2; r <= ultima; r++) {
    const a = ws.getCell(r, 2), b = ws.getCell(r, 17)
    a.border = { ...a.border, left: grossa }; b.border = { ...b.border, right: grossa }
  }
}

/* dias = saída de montarRdoMes; titulo = 'OUTUBRO 2026'; logo = ArrayBuffer do PNG ou null */
export function construirRdo(ExcelJS, dias, titulo, logo) {
  const wb = new ExcelJS.Workbook()
  const logoId = logo ? wb.addImage({ buffer: logo, extension: 'png' }) : null
  dias.forEach(dia => {
    const ws = wb.addWorksheet(`RDO ${titulo} (${dia.n})`, {
      views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    })
    folha(ws, dia, logoId)
  })
  return wb
}
