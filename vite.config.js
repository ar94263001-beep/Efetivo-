import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração mínima do Vite. Não precisa de mais nada para o padrão desta skill.
export default defineConfig({
  plugins: [react()],
})
