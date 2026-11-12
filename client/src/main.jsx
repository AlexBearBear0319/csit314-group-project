// BCE: Outside BCE (application setup or infrastructure).
// Mounts the React application in the HTML root and loads the global styles.

// =============================================================================
// ENTRY: main.jsx
// Starts the React website. It draws <App /> inside the browser router, so the
// address bar (for example /admin/accounts) decides which Boundary page shows.
// =============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
