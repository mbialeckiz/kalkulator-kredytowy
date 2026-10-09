import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build` skleja całość do jednego dist/index.html (artefakt).
// `vite build --mode webapp` to zwykły build aplikacji webowej z osobnymi plikami JS/CSS.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'webapp' ? [] : [viteSingleFile()])],
}));
