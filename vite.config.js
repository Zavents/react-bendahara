import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  // ⬅️ CRITICAL FIX: The base path must be your repo name
  base: "/react-bendahara/", 
  plugins: [react()],
});