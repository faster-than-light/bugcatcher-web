import React from 'react'
import Script from 'react-load-script'

// helpers
import { googleLoginId } from '../config'

const GOOGLE_BUTTON_ID = 'google-sign-in-button'
export default class GoogleSignIn extends React.Component {
  componentWillMount() {
    const meta = document.createElement("meta")
    meta.name = "google-signin-client_id"
    meta.content = googleLoginId
    document.body.appendChild(meta)
    setTimeout(this.setup, 666)
  }

  setup() {
    window.gapi.signin2.render(
      GOOGLE_BUTTON_ID,
      {
        scope: 'email',
        width: 'auto',
        height: 50,
        longtitle: true,
        theme: 'dark',
        onfailure: err => {console.error(err)},
        onsuccess: (googleUser) => {
          const profile = googleUser.getBasicProfile()
          console.log("Name: " + profile.getName())
          console.log({ googleUser })
        },
      },
    )
  }

  onSuccess(googleUser) {
    const profile = googleUser.getBasicProfile()
    console.log("Name: " + profile.getName())
  }

  handleScriptCreate(data) {
    console.log('handleScriptCreate', data)
    this.setState({ scriptLoaded: false })
  }
  
  handleScriptError(data) {
    console.log('handleScriptError', data)
    this.setState({ scriptError: true })
  }
  
  handleScriptLoad(data) {
    console.log('handleScriptLoad', data)
    this.setState({ scriptLoaded: true })
  }

  render() {
    return (<React.Fragment>
      <Script
        url="https://apis.google.com/js/platform.js?onload=init"
        async={true}
        defer={true}
        onCreate={this.handleScriptCreate.bind(this)}
        onError={this.handleScriptError.bind(this)}
        onLoad={this.handleScriptLoad.bind(this)}
        />
      <div id={GOOGLE_BUTTON_ID}/>
    </React.Fragment>)
  }
}