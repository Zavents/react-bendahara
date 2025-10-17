import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // CRITICAL FIX FOR GITHUB PAGES:
  // Sets the base public path when served in production, which is required
  // because GitHub Pages serves the app from a sub-directory named after the repo.
  base: "/react-bendahara/", 
  plugins: [react()],
});
