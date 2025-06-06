import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';

// Protezioni di base per l'ambiente di produzione
if (import.meta.env.PROD) {
  // Disabilita menu contestuale
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Disabilita scorciatoie per dev tools
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C') ||
      (e.ctrlKey && e.shiftKey && e.key === 'J') ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
