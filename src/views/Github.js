import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import queryString from 'query-string'

// components
import Menu from '../components/Menu'

// helpers
import { appUrl, github } from '../config'
import GitHubClient from '../helpers/github/GitHubClient'

// images & styles
import bugcatcherShield from '../assets/images/bugcatcher-shield-square.png'
import githubLogo from '../assets/images/github.png'
import StlButton from '../components/StlButton'
import '../assets/css/Github.css'

/** Constants */
let githubCliEnterprise, githubCliDotCom

export default class Github extends Component {
  componentWillMount() {
    githubCliEnterprise = new GitHubClient({
      baseUri: github.enterpriseUri,
      token: github.clientId
    })
    
    githubCliDotCom = new GitHubClient({
      baseUri: github.dotComUri,
      token: github.clientId
    })    
  }

  render() {
    const { code } = queryString.parse(document.location.search)

      return <div id="github">
      <Menu />
      <div style={{
        maxWidth: 720,
        margin: 'auto',
      }}>
        <div className="white-block" style={{ textAlign: 'center', marginTop: 111, padding: 18 }}>
          <div className="block-content">
            {
              !code ? null :
                <Link to={'/github'}
                  style={{float: 'left'}}>&laquo; back</Link>
            }
            <p className="oauth-images">
              <img src={bugcatcherShield} alt="BugCatcher" />
              <img src={githubLogo} alt="GitHub" />
            </p>
            {
              code ? <React.Fragment>
                <div className={'well'}>TOKEN: {code}</div>
                <div style={{padding: 21, textAlign: 'left'}}>
                  <StlButton primary semantic>Fetch Repository List</StlButton>
                </div>
              </React.Fragment> :
               <a href={`https://github.com/login/oauth/authorize?client_id=${github.clientId}&type=user_agent&redirect_uri=${appUrl}/gh_auth`}>
                 <StlButton className="big">Authorize the BugCatcher app on GitHub</StlButton>
               </a>
            }
          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
