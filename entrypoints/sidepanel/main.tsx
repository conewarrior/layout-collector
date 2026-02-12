import React from 'react';
import { createRoot } from 'react-dom/client';

function main() {
  const root = createRoot(document.getElementById('root')!);
  root.render(<div>Side Panel</div>);
}

main();
