// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // ⬅️ ADD THIS LINE
  base: "/react-bendahara/",
  // ⬆️ ADD THIS LINE
  plugins: [react()],
});