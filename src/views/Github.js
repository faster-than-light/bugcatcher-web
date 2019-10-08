import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import queryString from 'query-string'
import GitHubLogin from 'react-github-login'

// components
import Loader from '../components/Loader'
import Menu from '../components/Menu'

// helpers
import { appUrl, github } from '../config'
import { getCookie, setCookie } from '../helpers/cookies'
// import GitHubClient from '../helpers/github/GitHubClient'
import githubApi from '../helpers/githubApi'

// images & styles
import bugcatcherShield from '../assets/images/bugcatcher-shield-square.png'
import githubLogo from '../assets/images/github.png'
import StlButton from '../components/StlButton'
import '../assets/css/Github.css'

/** Constants */
const initialState = {
  code: null,
  contents: null,
  token: null,
  repos: null,
  user: null,
  working: false,
}
const cookieName = 'automate-gh_auth'
let githubCliEnterprise, githubCliDotCom, githubUserInfo

export default class Github extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...initialState,
      automateAuth: Boolean(getCookie(cookieName)),
    }

    this.toggleAutomateOption = this.toggleAutomateOption.bind(this)
    this.ApiFunctions = this.ApiFunctions.bind(this)
    this.RepoList = this.RepoList.bind(this)
  }

  async componentWillMount() {
    const automateAuth = getCookie(cookieName) == 'true'
    this.setState({
      code: queryString.parse(document.location.search)['code'] ?
        queryString.parse(document.location.search)['code'] : null,
      automateAuth,
    })
  }

  async toggleAutomateOption(event) {
    const automate = event.target.checked
    console.log(automate, this.state.automateAuth, getCookie(cookieName))
    await setCookie(cookieName, automate)
    await this.setState({ automateAuth: automate })
    console.log(automate, this.state.automateAuth, getCookie(cookieName))
  }
  
  resetState = () => {
    this.setState(initialState)
  }

  ApiFunctions = () => {
    const { automateAuth } = this.props
    if (automateAuth) return null
    else return <div style={{padding: 21, textAlign: 'left'}}>
      <StlButton primary semantic disabled={Boolean(this.state.token)}
        onClick={async () => {
          this.setState({ working: true })
          const accessToken = await githubApi.getAccessToken(this.state.code)
          if (accessToken) this.setState({
            token: accessToken,
            working: false,
          })
          else {
            alert('There was a problem fetching a token. Please try again.')
            this.resetState()
          }
        }}>Fetch Access Token &raquo;</StlButton>
      <StlButton primary semantic disabled={Boolean(!this.state.token || this.state.user)}
        onClick={ async () => {
          this.setState({ working: true })
          const user = await githubApi.getAuthenticated()
          this.setState({ user, working: false })
        }}>Fetch User Profile &raquo;</StlButton>
      <StlButton primary semantic disabled={Boolean(!this.state.user)}
        onClick={ async () => {
          this.setState({ working: true })
          const repos = await githubApi.getRepos()
          console.log({repos})
          this.setState({ repos, contents: null, working: false })
        }}>Fetch User&apos;s Repositories &raquo;</StlButton>
    </div>
  }

  RepoList = () => {
    if (this.state.repos && !this.state.contents) {
      const repos = this.state.repos.map((repo, k) => <li key={k}>
        <a onClick={async () => {
          const ref = prompt("Name of the commit/branch/tag?")
          const contents = await githubApi.getRepoContents(repo, ref)
          console.log(contents)
          this.setState({ contents })
        }}>{repo}</a>
      </li>)
      return <ul className="repo-list">
        <h3>Your Repositories</h3>
        { repos }
      </ul>
    }
    else return null
  }

  RepoContents = () => {
    if (this.state.contents) {
      const contents = this.state.contents.map((file, k) => <li key={k}>
        {file.path}
      </li>)
      return <ul className="repo-list">
        <h3>Repository Contents</h3>
        { contents }
      </ul>
    }
    else return null
  }

  render() {
    const { automateAuth, code, contents, repos, token, working } = this.state
    const onSuccess = response => {
      const { code } = response
      this.setState({ code, working: false })
    }
    const onFailure = response => console.error(response)

    return <div id="github">
      <Menu />
      <Loader show={working} text="working" />
      <div style={{
        maxWidth: 720,
        margin: 'auto',
      }}>
        <div className="white-block" style={{ textAlign: 'center', marginTop: 111, padding: 18 }}>
          <div className="block-content">

            {
              !code && !token ? null :
                <Link to={'/github'}
                  onClick={this.resetState}
                  style={{float: 'left'}}>&laquo; start over</Link>
            }

            <p className="oauth-images">
              <img src={bugcatcherShield} alt="BugCatcher" />
              <img src={githubLogo} alt="GitHub" />
            </p>

            <div style={{ display: automateAuth ? 'none' : 'block'}}>
            { 
              code && !token ? <React.Fragment>
                <div className={'well'}>TEMPORARY CODE: {code}</div>
              </React.Fragment> : null
            }
            { 
              token ? <React.Fragment>
                <div className={'well'}>ACCESS TOKEN: {token}</div>
              </React.Fragment> : null
            }
            </div>

            {
              code ? <this.ApiFunctions automateAuth={automateAuth} /> : <React.Fragment>
                <p>
                  <a href={`https://github.com/login/oauth/authorize?client_id=${github.clientId}&type=user_agent&scope=user,repo&redirect_uri=${appUrl}/gh_auth`}>
                    <StlButton className="big"
                    onClick={
                      () => { this.setState({ working: true }) }
                    }>Option 1&raquo;In Same Window</StlButton>
                  </a>
                  <GitHubLogin className="big btn"
                    clientId={github.clientId}
                    redirectUri=''
                    scope="user repo"
                    buttonText="Option 2&raquo;In New Tab"
                    onSuccess={onSuccess}
                    onFailure={onFailure}/>
                </p>

                <p>
                  <input type="checkbox" onChange={this.toggleAutomateOption}
                    checked={this.state.automateAuth} />
                  &nbsp;Automate all steps of the authentication process
                </p>

                <ul style={{textAlign: 'left', margin: 18}}>
                  <li>Option 1 is redirecting you straight to Github in this window.</li>
                  <li>Option 2 is using a React JS component library to use a new window/tab to log in.</li>
                </ul>
                <p>Both options result in a temporary <code>code</code> being returned from GitHub. This code can be used with the GitHub API for 10 minutes to retrieve an <code>Access Token</code>. The access token can then be used to interact with GitHub on behalf of the user for 1 hour or until the user logs out of GitHub.</p>
              </React.Fragment>
            }

            <this.RepoList />

            <this.RepoContents />

          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
