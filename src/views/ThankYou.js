import React, { Component } from 'react'
import { Link } from 'react-router-dom'

// helpers
import StlButton from '../components/StlButton'

// images & styles
import logo from '../assets/images/ftl-rocket-color.png'
import bugcatcherLogo from '../assets/images/bugcatcher-transparent.png'
import '../assets/css/ThankYou.css'

export default class ThankYou extends Component { 
  componentWillMount() {
    console.log({props: this.props})
  }
  render() {
    return <div id="thank_you">
      <div style={{
        maxWidth: 720,
        margin: 'auto',
      }}>
        <div className={'logos'}>
          <img src={bugcatcherLogo} alt="BugCatcher" />
          <img src={logo} alt="Faster Than Light" />
        </div>
        <div className="white-block">
          <div className="block-content">
            <h1 className="secondary-color">Thank you for pre-registering!</h1>
            <h3 style={{margin:0}}>Here&apos;s what you need to know about your subscription:</h3>
            <ul style={{ textAlign: 'left' }}>
              <li>You will be among the first to get access to the new Pro tool. We&apos;ll email you to let you know when it&apos;s available.</li>
              <li>You won&apos;t be charged until January 1, 2020. BugCatcher will be free for you to use until then. You can cancel any time (in Settings.)</li>
              <li>We love our early adopters! If you&apos;d like to set up a video call with our CEO, just email <a href="mailto:elissa@fasterthanlight.dev">elissa@fasterthanlight.dev</a>. We&apos;d love to meet you.</li>
              <li>You can log in using your Google account (the same one you used to sign up.)</li>
              <li>You can use our <a href="https://github.com/faster-than-light/ftl" target="_blank">CLI Tool</a> with your new BugCatcher account.</li>
              <li>You can follow our updates on Twitter at <a href="https://twitter.com/ftlbugcatcher" target="_blank">@ftlbugcatcher</a>.</li>
            </ul>
            <p style={{ textAlign: 'center', marginTop: 30 }}>
              <Link to={'/'}>
                <StlButton style={{ minWidth: 210 }}>Continue</StlButton>
              </Link>
            </p>
          </div>
        </div>
        <br />
      </div>
    </div>
  }
}
