import { useEffect, useState } from 'react'

// Preferência de tela guardada no navegador (aba aberta, filtros). Não é dado: se sumir, nada se perde.
export function usePref(chave, inicial) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(chave); return s == null ? inicial : (typeof inicial === 'object' && inicial !== null ? { ...inicial, ...JSON.parse(s) } : JSON.parse(s)) } catch (_) { return inicial }
  })
  useEffect(() => { try { localStorage.setItem(chave, JSON.stringify(v)) } catch (_) { /* sem armazenamento */ } }, [chave, v])
  return [v, setV]
}
