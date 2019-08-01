import React, { Component } from 'react'
import { Link } from 'react-router-dom'

// components
import StlButton from './StlButton'

// helpers
import { showCookiesAlert } from '../config'
import { getCookie, setCookie } from '../helpers/cookies'

// images and styles
import '../assets/css/components/CookiesAlert.css'

export default class CookiesAlert extends Component {
  state = {
    cookiesAccepted: getCookie("cookies-accepted")
  }
  render() {
    if (this.state.cookiesAccepted || showCookiesAlert === false) return null
    else return (
      <div>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: '100%',
          background: 'rgba(0, 0, 0, 0.6)'
        }}></div>
        <div id='cookies-alert'>
          <p>Cookies and IP addresses allow us to deliver and improve our web content, resolve technical errors, and provide you with a personalized experience. Our website uses cookies and collects your IP address for these purposes.</p>
          <div className="standout">
            Faster Than Light may use cookies and my IP address to
            collect individual statistics in order to help diagnose
            software errors and improve user experience in accordance 
            with our <a href="https://fasterthanlight.dev/privacy" target="_blank">Privacy Policy</a> and the <a href="https://fasterthanlight.dev/terms" target="_blank">Terms of Use</a>. I can revoke
            my consent at any time by visiting the <Link to={'/account'}>Account</Link> page.
            <StlButton className="small grey"
              style={{
                // float: 'right'
                marginTop: 9,
                position: 'absolute',
                right: 24
              }}
              onClick={() => {
                setCookie("cookies-accepted", true)
                this.setState({ cookiesAccepted: true })
              }}
              >I Agree</StlButton>
          </div>
          <p style={{ textAlign: 'center', paddingTop: 6 }}>
            <StlButton className="tiny link"
              onClick={() => {
                this.setState({ cookiesAccepted: true })
              }}>No, I disagree</StlButton>
          </p>
        </div>
      </div>
    )
  }
}
