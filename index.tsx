import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Use a module-scoped variable to hold the root instance.
let rootInstance: ReturnType<typeof ReactDOM.createRoot> | null = null;

function renderApp() {
  if (!rootInstance) {
    rootElement!.innerHTML = '';
    rootInstance = ReactDOM.createRoot(rootElement!);
  }

  rootInstance.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

renderApp();

// Hot Module Replacement (HMR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((import.meta as any).hot) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).hot.accept(() => {
    renderApp();
  });
}
