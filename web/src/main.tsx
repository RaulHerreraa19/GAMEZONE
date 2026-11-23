import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './hooks/useAuth';
import { StationTv } from './pages/StationTv';
import './styles.css';

// /estacion/:id is the public TV screen of one station: no login, no panel.
const tv = window.location.pathname.match(/^\/estacion\/(\d+)\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {tv ? (
      <StationTv id={Number(tv[1])} />
    ) : (
      <AuthProvider>
        <App />
      </AuthProvider>
    )}
  </StrictMode>,
);
