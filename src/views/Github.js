import React, { Component } from 'react'

// components
import Menu from '../components/Menu'

// helpers
import { appUrl, github } from '../config'
// import GitHubClient from '../helpers/github/GitHubClient'

// images & styles
import bugcatcherShield from '../assets/images/bugcatcher-shield.png'
import githubLogo from '../assets/images/github.png'
import StlButton from '../components/StlButton'
import '../assets/css/Github.css'

/** Constants */
// let githubCliEnterprise, githubCliDotCom

export default class Github extends Component {
  // componentWillMount() {
  //   githubCliEnterprise = new GitHubClient({
  //     baseUri: github.enterpriseUri,
  //     token: github.clientId()
  //   })
    
  //   githubCliDotCom = new GitHubClient({
  //     baseUri: github.dotUri,
  //     token: github.clientId()
  //   })    
  // }

  render() {
    return <div id="dashboard">
      <Menu />
      <div style={{
        maxWidth: 720,
        margin: 'auto',
      }}>
        <div className="white-block" style={{ textAlign: 'center', marginTop: 111, padding: 18 }}>
          <div className="block-content">
          <p className="oauth-images">
            <img src={bugcatcherShield} alt="BugCatcher" />
            <img src={githubLogo} alt="GitHub" />
          </p>
            <a href={`https://github.com/login/oauth/authorize?client_id=${github.clientId}&type=user_agent&redirect_uri=${appUrl}/gh_auth`}>
              <StlButton className={'big'}>Authorize the BugCatcher App on GitHub</StlButton>
            </a>
          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
