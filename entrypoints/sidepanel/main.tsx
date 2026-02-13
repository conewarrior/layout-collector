import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import App from './App';

function main() {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
}

main();
