import React, { Component } from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

// components
import Account from './views/Account'
import Code from './views/Code'
import CookiesAlert from './components/CookiesAlert'
import FAQ from './views/FAQ/FAQ'
import Home from './views/Home'
import Results from './views/Results'
import Tests from './views/Tests'
import Tour from './views/Tour'

// context
import { UserContext } from './contexts/UserContext'

// helpers
import { intercomAppId, mixpanelToken } from './config'
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
    
    const user = await this.fetchUser()
    
    // Intercom settings
    window.intercomSettings = { app_id: intercomAppId }
    if (user) window.intercomSettings = {
      ...window.intercomSettings,
      name: user.name,
      email: user.email
    }
  
    // Intercom init script
    const init = () => {
      var w=window;
      var ic=w.Intercom;
      if(typeof ic==="function"){
        ic('reattach_activator');
        ic('update',w.intercomSettings);
      }else{
        var d=document;
        var i=function(){i.c(arguments);};
        i.q=[];
        i.c=function(args){i.q.push(args);};
        w.Intercom=i;
        var l=function(){
          var s=d.createElement('script');
          s.type='text/javascript';
          s.async=true;
          s.src='https://widget.intercom.io/widget/' + intercomAppId;
          var x=d.getElementsByTagName('script')[0];
          x.parentNode.insertBefore(s,x);
        };
        if(w.attachEvent){
          w.attachEvent('onload',l);
        }else{
          w.addEventListener('load',l,false);
        }
      }
    }
    init()

  }

  async fetchUser(clearStorage) {
    const user = await this.context.actions.fetchUser(clearStorage)
    const { userDataLoaded } = this.context.state
    if (user && userDataLoaded) this.setState({
      user,
      userDataLoaded,
    })
    return user
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
          <CookiesAlert />
        </div>
      </BrowserRouter>
    )
  }
}

export default App
