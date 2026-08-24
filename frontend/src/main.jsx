import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';

// Global styles
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Smooth transitions for theme switching */
  body, body * {
    transition: background-color 0.2s ease, color 0.1s ease, border-color 0.2s ease;
  }

  /* Remove up/down spin arrows from number inputs */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none !important;
    margin: 0 !important;
  }

  input[type=number] {
    -moz-appearance: textfield !important;
    appearance: textfield !important;
  }

  /* Print styles */
  @media print {
    .no-print {
      display: none !important;
    }
  }
`;

// Inject global styles
const style = document.createElement('style');
style.textContent = globalStyles;
document.head.appendChild(style);

// Prevent mouse wheel scrolling from unintentionally incrementing number inputs only when the wheel event targets the number input directly
document.addEventListener(
  'wheel',
  (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
      e.target.blur();
    }
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
