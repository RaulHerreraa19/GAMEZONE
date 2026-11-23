import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const tv = window.location.pathname.match(/^\/estacion\/(\d+)\/?$/);

createRoot(document.getElementById('root')!).render(<StrictMode>{tv ? <p>TV {tv[1]}</p> : <App />}</StrictMode>);
