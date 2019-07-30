import React from 'react'
import Script from 'react-load-script'

export default class AddScript extends React.PureComponent {

  render() {
    return (<React.Fragment>
      <Script
        url="https://apis.google.com/js/platform.js"
        onCreate={this.handleScriptCreate.bind(this)}
        onError={this.handleScriptError.bind(this)}
        onLoad={this.handleScriptLoad.bind(this)}
      />
      <Script>
        {
          window.gapi = window.gapi
        }
      </Script>
    </React.Fragment>)
  }

  handleScriptCreate() {
    this.setState({ scriptLoaded: false })
  }

  handleScriptError() {
    this.setState({ scriptError: true })
  }

  handleScriptLoad() {
    this.setState({ scriptLoaded: true })
  }

}