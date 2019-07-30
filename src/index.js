import React from 'react'
import ReactDOM from 'react-dom'
import { StripeProvider } from 'react-stripe-elements'
import * as serviceWorker from './serviceWorker'

// components
import App from './App'

// context
import { UserProvider } from './contexts/UserContext'

// helpers
import { stripePublicKey } from './config'

// styles
import 'semantic-ui-css/semantic.min.css'
import './assets/css/index.css'

ReactDOM.render(
  <StripeProvider apiKey={stripePublicKey}>
    <UserProvider>
      <App />
    </UserProvider>
  </StripeProvider>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
