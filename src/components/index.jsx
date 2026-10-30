import { createContext, useContext, useEffect, useRef, useState } from 'react'

/* ---------- aviso rápido no rodapé ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('')
  const t = useRef(null)
  const toast = m => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 3200) }
  return <ToastCtx.Provider value={toast}>{children}{msg && <div className="toast" role="status">{msg}</div>}</ToastCtx.Provider>
}

/* ---------- janela (dialog) ---------- */
export function Dialog({ open, onClose, title, children, footer }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current; if (!d) return
    if (open && !d.open) { try { d.showModal() } catch (_) { d.setAttribute('open', '') } }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} onCancel={e => { e.preventDefault(); onClose() }} aria-label={title}>
      {open && <>
        <div className="dlg-h"><h2>{title}</h2><button type="button" className="btn small" onClick={onClose}>Fechar</button></div>
        {children}
        {footer && <div className="dlg-f">{footer}</div>}
      </>}
    </dialog>
  )
}

export const Pill = ({ cls, children }) => <span className={'pill ' + cls}>{children}</span>

export function Kpis({ items }) {
  return <div className="kpis">{items.map(([l, v, s]) => <div className="kpi" key={l}><div className="l">{l}</div><div className="v">{v}</div><div className="s">{s}</div></div>)}</div>
}

/* items = [classe, rótulo, título em negrito, texto] */
export function Alerts({ items, vazio = 'Nada pendente nesse recorte.' }) {
  if (!items.length) return <p className="count">{vazio}</p>
  return <div className="alerts">{items.map(([c, r, t, d], i) => <div className="alert" key={i}><Pill cls={c}>{r}</Pill><div><b>{t}</b> {d}</div></div>)}</div>
}

/* ---------- barras horizontais (empilhadas) ----------
   rows = [{ label, total, text, parts: [{ v, color, name }] }] */
export function HBars({ rows, aria, fmt = v => v, valW = 46 }) {
  const ref = useRef(null)
  const [W, setW] = useState(600)
  const [tip, setTip] = useState(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const medir = () => setW(Math.max(el.clientWidth, 300))
    medir()
    const ro = new ResizeObserver(medir); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const labW = Math.min(215, W * 0.44), rowH = 26, gap = 6
  const max = Math.max(1, ...rows.map(r => r.total)), plotW = W - labW - valW - 8, H = rows.length * (rowH + gap) + 4
  return (
    <div ref={ref} onMouseLeave={() => setTip(null)}>
      {!rows.length ? <p className="count">Nenhum registro com esses filtros.</p> :
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
          {rows.map((r, i) => {
            const y = i * (rowH + gap) + 2; let x = labW
            const lab = r.label.length > 30 ? r.label.slice(0, 29) + '…' : r.label
            const barras = r.parts.map((p, j) => {
              if (!p.v) return null
              const last = r.parts.slice(j + 1).every(q => !q.v)
              const w = Math.max(2, p.v / max * plotW - (last ? 0 : 2)), x0 = x
              x += w + 2
              return <g key={j} onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, t: r.label, s: `${p.name}: ${fmt(p.v)}` })}>
                <rect x={x0} y={y + 3} width={w} height={rowH - 6} rx={last ? 4 : 0} fill={p.color} />
                {last && <rect x={x0} y={y + 3} width={Math.min(4, w)} height={rowH - 6} fill={p.color} pointerEvents="none" />}
              </g>
            })
            return <g key={i}>
              <text x={labW - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize="12.5" fill="var(--ink)">{lab}</text>
              {barras}
              <text x={x + 4} y={y + rowH / 2 + 4} fontSize="12.5" fontFamily="var(--mono)" fill="var(--muted)">{r.text}</text>
            </g>
          })}
        </svg>}
      {tip && <div className="tip" style={{ left: Math.min(tip.x + 14, innerWidth - 270), top: tip.y + 14 }}><b>{tip.t}</b><br />{tip.s}</div>}
    </div>
  )
}
export const barraUnica = color => ([k, v]) => ({ label: k, total: v, text: String(v), parts: [{ v, color, name: 'Quantidade' }] })

/* ---------- rosca ---------- */
export function Donut({ parts, center, sub }) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1, R = 60, r = 40, varias = parts.filter(q => q.v).length > 1
  const P = (ang, rad) => `${(70 + rad * Math.cos(ang)).toFixed(2)} ${(70 + rad * Math.sin(ang)).toFixed(2)}`
  const segs = []
  let a0 = -Math.PI / 2
  for (const p of parts.filter(q => q.v)) {
    const a1 = a0 + p.v / tot * Math.PI * 2 - (varias ? 0.03 : 0), big = (a1 - a0) > Math.PI ? 1 : 0
    segs.push({ p, d: `M${P(a0, R)} A${R} ${R} 0 ${big} 1 ${P(a1, R)} L${P(a1, r)} A${r} ${r} 0 ${big} 0 ${P(a0, r)} Z` })
    a0 = a1 + (varias ? 0.03 : 0)
  }
  const fatias = segs.map(({ p, d }) => <path key={p.n} d={d} fill={p.c}><title>{`${p.n}: ${p.v}`}</title></path>)
  return <svg viewBox="0 0 140 140" width="100%" height="100%" role="img" aria-label={sub}>{fatias}
    <text x="70" y="70" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1B2A4A">{center}</text>
    <text x="70" y="88" textAnchor="middle" fontSize="9" fill="#5B6B7F">{sub}</text></svg>
}

/* ---------- botões de status (P, F, FJ...) ---------- */
export function Status({ opcoes, valor, onChange, disabled }) {
  return <span className="stt">{opcoes.map(([k, n]) =>
    <button key={k} type="button" className={valor === k ? 'c-' + k : ''} aria-pressed={valor === k} title={n} disabled={disabled}
      onClick={() => onChange(valor === k ? '' : k)}>{k}</button>)}</span>
}

/* select de obra que aceita um valor fora da lista */
export function SelectObra({ value, obras, onChange, label, disabled }) {
  return <select value={value} onChange={e => onChange(e.target.value)} aria-label={label} disabled={disabled}>
    {obras.map(o => <option key={o}>{o}</option>)}{!obras.includes(value) && <option>{value}</option>}
  </select>
}

/* campo de texto que só grava ao sair do campo (evita gravar a cada letra) */
export function CampoTexto({ value, onSave, ...rest }) {
  const [v, setV] = useState(value || '')
  useEffect(() => { setV(value || '') }, [value])
  return <input {...rest} value={v} onChange={e => setV(e.target.value)} onBlur={() => { if (v !== (value || '')) onSave(v) }}
    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
}
