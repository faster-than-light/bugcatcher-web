import React, { Component } from 'react'
import { Link } from 'react-router-dom'

// components
import FtlButton from './FtlButton'

// helpers
import { showCookiesAlert } from '../config'
import { getCookie, setCookie } from '../helpers/cookies'
import { showWidget } from '../helpers/intercom'

// images and styles
import '../assets/css/components/CookiesAlert.css'

// constants
const cookieName = "cookies-permitted"
const oldCookieName = "cookies-accepted"
setCookie(oldCookieName, null, -1)

export default class CookiesAlert extends Component {
  state = {
    cookiesPermitted: getCookie(cookieName)
  }

  componentDidMount() {
    if (!this.state.cookiesPermitted) document.body.classList.add("hide-intercom")
  }

  componentWillUnmount() {
    this.showIntercom()
  }

  showIntercom() {
    document.body.classList.remove("hide-intercom")
  }

  agree = () => {
    setCookie(cookieName, true, 90)
    this.setState({ cookiesPermitted: true })
    showWidget()
  }

  render() {
    if (this.state.cookiesPermitted || showCookiesAlert === false) return null
    else return (
      <div>
        <div style={{
          position: 'absolute',
          zIndex: 0,
          left: 0,
          top: 0,
          height: '100vh',
          width: '100%',
          background: 'rgba(0, 0, 0, 0.6)',
        }}></div>
        <div id='cookies-alert'>
          <p>Cookies and IP addresses allow us to deliver and improve our web content, resolve technical errors, and provide you with a personalized experience. Our website uses cookies and collects your IP address for these purposes.</p>
          <div className="standout">
            <FtlButton semantic big grey
              style={{
                float: 'right',
                // marginTop: 9,
                marginLeft: 18,
                // position: 'absolute',
                // left: 24
              }}
              onClick={this.agree}
              >I Agree</FtlButton>
            Faster Than Light may use cookies and my IP address to
            collect individual statistics in order to help diagnose
            software errors and improve user experience in accordance 
            with our <a href="https://fasterthanlight.dev/privacy" target="_blank">Privacy Policy</a> and the <a href="https://fasterthanlight.dev/terms" target="_blank">Terms of Use</a>. I can revoke
            my consent at any time by visiting the <Link to={'/account'}>Account</Link> page.
          </div>
        </div>
      </div>
    )
  }
}
