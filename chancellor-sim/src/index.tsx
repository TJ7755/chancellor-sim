import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import ChancellorGame from './ChancellorGame';

const root = ReactDOM.createRoot( document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ChancellorGame />
  </React.StrictMode>
);
