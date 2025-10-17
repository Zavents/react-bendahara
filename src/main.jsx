import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// We import HashRouter instead of BrowserRouter for compatibility with GitHub Pages
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Use HashRouter to enable routing on GitHub Pages */}
    <HashRouter> 
      <App />
    </HashRouter>
  </StrictMode>
);
