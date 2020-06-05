import React, { Component } from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

// components
import About from './views/About'
import Account from './views/Account'
import Code from './views/Code'
import CookiesAlert from './components/CookiesAlert'
import CQC from './views/CQC'
import Dashboard from './views/Dashboard'
import FAQ from './views/FAQ/FAQ'
import GitHub from './views/GitHub'
import GitHubOAuth from './views/GitHubOAuth'
import Home from './views/Home'
import Project from './views/Project'
import Projects from './views/Projects'
import Publish from './views/Publish'
import Repositories from './views/GitHub/Repositories'
import Results from './views/Results'
import ResultsPDF from './views/ResultsPDF'
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
    this.setUser(user)
    
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
            <Route path="/about" component={() => <About {...props} />} exact />
            <Route path="/account" component={() => <Account {...props} />} exact />
            <Route path="/cqc" component={() => <CQC {...props} />} exact />
            <Route path="/code/:id" component={Code} exact />
            <Route path="/dashboard" component={() => <Dashboard {...props} />} exact />
            <Route path="/faq" component={() => <FAQ {...props} />} exact />
            <Route path="/github/gh_auth" component={() => <GitHub {...props} />} exact />
            <Route path="/github" component={() => <GitHub {...props} />} exact />
            <Route path="/github/oauth" component={() => <GitHubOAuth {...props} />} exact />
            <Route path="/projects" component={() => <Projects {...props} />} exact />
            <Route path="/thankyou" component={() => <ThankYou {...props} />} exact />
            <Route path="/tour" component={() => <Tour {...props} />} exact />
            <Route path="/project/:id" component={Project} exact />
            <Route path="/publish/:id" component={Publish} exact />
            <Route path="/github/repos" component={() => <Repositories {...props} />} exact />
            <Route path="/results" component={Results} exact />
            <Route path="/results/pdf" component={ResultsPDF} exact />
          </Switch>
          <CookiesAlert />
        </div>
      </BrowserRouter>
    )
  }
}

export default App
