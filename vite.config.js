import { defineConfig } from 'vite'

// GitHub Pages serve il sito da https://vinzoni.github.io/base-memory/, quindi
// gli asset vanno riferiti sotto questo sottopercorso. Il valore è fisso e non
// condizionato al comando: con `base` calcolato solo per la build, `npm run
// preview` servirebbe dalla radice mentre l'HTML cerca il sottopercorso, e la
// pagina resterebbe bianca. Legato al nome del repository: se cambia, va
// aggiornato anche qui.
export default defineConfig({
  base: '/base-memory/',
})
