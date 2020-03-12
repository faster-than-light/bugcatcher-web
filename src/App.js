import React, { Component } from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

// components
import Account from './views/Account'
import BulkGithub from './views/BulkGithub'
import Code from './views/Code'
import CookiesAlert from './components/CookiesAlert'
import CQC from './views/cqc/CQC'
import FAQ from './views/FAQ/FAQ'
import Github from './views/Github'
import Home from './views/Home'
// import Pricing from './views/Pricing'
import Project from './views/Project'
import Results from './views/Results'
import SetSid from './views/SetSid'
import Tests from './views/Tests'
import ThankYou from './views/ThankYou'
import Tour from './views/Tour'

// context
import { UserContext } from './contexts/UserContext'

// helpers
// import { mixpanelToken } from './config'
import { init as intercom } from './helpers/intercom'
import { version } from '../package.json'

// styles
import './assets/css/App.css'

class App extends Component {
  state = {}
  static contextType = UserContext

  async componentWillMount() {
    // window.mixpanel.init(mixpanelToken)
    window.version = version
    console.log(`Running BugCatcher v${version} in the ${String(process.env.REACT_APP_FTL_ENV).toUpperCase()} environment`)
    
    const user = await this.fetchUser()
    
    // Initialize Intercom script
    intercom(user)

  }

  async fetchUserData(clearStorage) {
    const user = await this.context.actions.fetchUser(clearStorage)
    const { userDataLoaded } = this.context.state
    const userData = {
      user,
      userDataLoaded,
    }
    if (user && userDataLoaded) this.setState(userData)
    return userData
  }

  async fetchUser(clearStorage) {
    const userData = await this.fetchUserData(clearStorage)
    return userData ? userData.user : null
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
          // window.mixpanel.track('Error', props)
      }
    })()

    // window.mixpanel.track('App Loaded', { version })

    const props = {
      ...this.state,
      fetchUser: this.fetchUser.bind(this),
      fetchUserData: this.fetchUserData.bind(this),
      setUser: this.setUser.bind(this),
    }

    return (
      <BrowserRouter>
        <div id="top" className="app">
          <Switch>
            <Route path="/" component={() => <Home {...props} />} exact />
            <Route path="/account" component={() => <Account {...props} />} exact />
            <Route path="/bulkgithub" component={() => <BulkGithub {...props} />} exact />
            <Route path="/cqc" component={() => <CQC {...props} />} exact />
            <Route path="/faq" component={() => <FAQ {...props} />} exact />
            <Route path="/gh_auth" component={() => <Github {...props} />} exact />
            <Route path="/github" component={() => <Github {...props} />} exact />
            {/* <Route path="/pricing" component={() => <Pricing {...props} />} exact /> */}
            <Route path="/projects" component={() => <Project {...props} />} exact />
            <Route path="/tests" component={() => <Tests {...props} />} exact />
            <Route path="/thankyou" component={() => <ThankYou {...props} />} exact />
            <Route path="/tour" component={() => <Tour {...props} />} exact />
            <Route path="/project/:id" component={Code} exact />
            <Route path="/results/:id" component={Results} exact />
            <Route path="/sid/:sid" component={SetSid} exact />
          </Switch>
          <CookiesAlert />
        </div>
      </BrowserRouter>
    )
  }
}

export default App
