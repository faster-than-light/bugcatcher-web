import React, { Component } from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

// components
import Account from './views/Account'
import Code from './views/Code'
import FAQ from './views/FAQ/FAQ'
import Home from './views/Home'
import Results from './views/Results'
import Tests from './views/Tests'
import Tour from './views/Tour'

// context
import { UserContext } from './contexts/UserContext'

// helpers
import { mixpanelToken } from './config'
import { version } from '../package.json'

// styles
import './assets/css/App.css'

class App extends Component {
  state = {}
  static contextType = UserContext

  async componentWillMount() {
    window.mixpanel.init(mixpanelToken)
    window.version = version
    console.log(`Running BugCatcher v${version} in the ${String(process.env.REACT_APP_FTL_ENV).toUpperCase()} environment`)
    await this.fetchUser()
  }

  async fetchUser(clearStorage) {
    const user = await this.context.actions.fetchUser(clearStorage)
    const { userDataLoaded } = this.context.state
    if (user && userDataLoaded) this.setState({
      user,
      userDataLoaded,
    })
  }

  setUser(user) {
    this.context.actions.setUser(user)
    this.setState({ user })
  }

  render() {
    /** @dev Extend `console.error` to send data to Mixpanel */
    (function() {
      var exLog = console.error
      console.error = function(err) {
          exLog.apply(this, arguments)
          let props = typeof err === 'object' ? {
            message: err.message,
            stack: err.stack
          } : {
            message: err
          }
          props.version = version
          window.mixpanel.track('Error', props)
      }
    })()

    window.mixpanel.track('App Loaded', { version })

    const props = {
      ...this.state,
      fetchUser: this.fetchUser.bind(this),
      setUser: this.setUser.bind(this),
    }

    return (
      <BrowserRouter>
        <div id="top" className="app">
          <Switch>
            <Route path="/" component={() => <Home {...props} />} exact />
            <Route path="/account" component={() => <Account {...props} />} exact />
            <Route path="/faq" component={() => <FAQ {...props} />} exact />
            <Route path="/tests" component={() => <Tests {...props} />} exact />
            <Route path="/tour" component={() => <Tour {...props} />} exact />
            <Route path="/project/:id" component={Code} exact />
            <Route path="/results/:id" component={Results} exact />
          </Switch>
        </div>
      </BrowserRouter>
    )
  }
}

export default App
