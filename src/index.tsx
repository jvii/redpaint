import React from 'react';
import ReactDOM from "react-dom/client";
import App from './components/App';
import { createOvermind } from 'overmind';
import { Provider } from 'overmind-react';
import { config } from './overmind/';
import * as serviceWorker from './serviceWorker';
import './canvas/util/benchmark';
import './index.css';

export const overmind = createOvermind(config, {
  devtools: false, // defaults to 'localhost:3031'
});

// debug access from the devtools console
(window as unknown as { __redpaint: typeof overmind }).__redpaint = overmind;

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Provider value={overmind}>
    <App />
  </Provider>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
