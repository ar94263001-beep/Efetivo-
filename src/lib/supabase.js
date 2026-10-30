import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Chave publicável (sb_publishable_...). Ela pode ir para o navegador: quem protege os dados é a RLS do banco.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Sem as chaves (modo de teste) o app roda com os dados de exemplo e não cria a conexão.
export const supabase = url && key ? createClient(url, key) : null
