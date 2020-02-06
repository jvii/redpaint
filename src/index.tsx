import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import { createOvermind } from 'overmind';
import { Provider } from 'overmind-react';
import { config } from './overmind/';
import * as serviceWorker from './serviceWorker';
import './index.css';

export const overmind = createOvermind(config, {
  devtools: true, // defaults to 'localhost:3031'
});

ReactDOM.render(
  <Provider value={overmind}>
    <App />
  </Provider>,
  document.getElementById('root') as HTMLElement
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
