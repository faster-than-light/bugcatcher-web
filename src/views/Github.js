import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
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
  currentRepo: null,
  branches: null,
  redirect: null,
  repos: null,
  token: null,
  tree: null,
  user: null,
  working: false,
}
const automateCookieName = 'automate-gh_auth'
const tokenCookieName = 'github-ftl-token'
let githubCliEnterprise, githubCliDotCom, githubUserInfo

export default class Github extends Component {
  constructor(props) {
    super(props)

    let token = getCookie(tokenCookieName)
    token = token.length ? token : null
    this.state = {
      ...initialState,
      automateAuth: getCookie(automateCookieName) == 'true',
      token,
    }

    this.toggleAutomateOption = this.toggleAutomateOption.bind(this)
    this.ApiFunctions = this.ApiFunctions.bind(this)
    this.RepoList = this.RepoList.bind(this)
  }

  async componentWillMount() {
    const code = queryString.parse(document.location.search)['code']
    let { token, user } = this.state
    if (!token && code) {
      token = await this.fetchToken()
    }
    if (token) {
      await githubApi.setToken(token)
      user = await this.fetchUser()
    }
    console.log({
      token, 
      cookie: getCookie(tokenCookieName), 
      user,
      code,
      codeBool: Boolean(!user && code),
    })
    this.setState({
      code: !user && code ? code : null,
      user,
    })
  }

  async toggleAutomateOption(event) {
    const automate = event.target.checked
    await setCookie(automateCookieName, automate)
    await this.setState({ automateAuth: automate })
  }
  
  resetState = () => {
    setCookie(tokenCookieName, '')
    this.setState(initialState)
  }

  runApiFunctions = async () => {
    const { code, repos, token, user } = this.state
    if (code && !token) await this.fetchToken()
    if (!user) await this.fetchUser()
    if (!repos) await this.fetchRepos()
  }
  
  ApiFunctions = () => {
    const { automateAuth } = this.state
    if (automateAuth) this.runApiFunctions()
    return this.ApiButtons()
  }
  
  ApiButtons = () => {
    return <div style={{padding: 21, textAlign: 'left'}}>

      <this.FetchAccessToken />

      <this.FetchUserProfile />

      <this.FetchUserRepos />

    </div>
  }

  fetchToken = async alertError => {
    let token
    try {
      token = await githubApi.getAccessToken(this.state.code)
    } catch(e) { console.error(e) }
    if (!token) {
      if (alertError) alert('There was a problem fetching a token. Please try again.')
      this.resetState()
    }
    else {
      setCookie(tokenCookieName, token)
      this.setState({ token })
    }
    return token
  }

  fetchUser = async alertError => {
    let user
    try { user = await githubApi.getAuthenticated() }
    catch(e) { console.error(e) }
    if (!user) {
      if (alertError) alert("There was a problem fetching your Profile. Please start over and try again.")
      this.resetState()
    }
    else this.setState({ user })
    return user
  }

  fetchRepos = async alertError => {
    let repos
    try { repos = await githubApi.getRepos() }
    catch(e) { console.error(e) }
    if (!repos && alertError) alert("There was a problem fetching your Repository List. Please start over and try again.")
    else this.setState({ repos, contents: null })
    return repos
  }

  FetchAccessToken = () => <StlButton primary semantic disabled={Boolean(this.state.token)}
    onClick={async () => {
      this.setState({ working: true })
      await this.fetchToken(true)
      this.setState({ working: false }) 
    }}>Fetch Access Token &raquo;</StlButton>

  FetchUserProfile = () => <StlButton primary semantic
    disabled={Boolean(!this.state.token || this.state.user)}
    onClick={ async () => {
      this.setState({ working: true })
      await this.fetchUser(true)
      this.setState({ working: false })
    }}>Fetch User Profile &raquo;</StlButton>

  FetchUserRepos = () => <StlButton primary semantic disabled={Boolean(!this.state.user)}
    onClick={ async () => {
      this.setState({ branches: null, tree: null, working: true })
      await this.fetchRepos()
      this.setState({ working: false })
    }}>Fetch User&apos;s Repositories &raquo;</StlButton>

  RepoList = () => {
    if (this.state.repos && !this.state.branches) {
      const repos = this.state.repos.map((repo, k) => <li key={k}>
        <a onClick={() => this.getBranches(repo)}>{repo}</a>
      </li>)
      return <ul className="repo-list">
        <h3>Your Repositories</h3>
        { repos }
      </ul>
    }
    else return null
  }

  getBranches = async currentRepo => {
    this.setState({ working: true })
    const [ owner, repo ] = currentRepo.split('/')
    let branches = await githubApi.getBranches(owner, repo)
    branches = branches.map(b => b.name)
    this.setState({ branches, currentRepo, working: false })
  }

  BranchList = () => {
    if (this.state.branches && !this.state.tree) {
      const branches = this.state.branches.map((branch, k) => <li key={k}>
        <a onClick={() => { this.getTree(branch) }}>{branch}</a>
      </li>)
      return <ul className="repo-list">
        <h3>{`Choose a branch of ${this.state.currentRepo}`}</h3>
        { branches }
      </ul>
    }
    else return null
  }

  getTree = async branchName => {
    this.setState({ working: true })
    const [ owner, repo ] = this.state.currentRepo.split('/')
    const branch = await githubApi.getBranch(owner, repo, branchName)

    if (
      branch &&
      branch.commit &&
      branch.commit.commit &&
      branch.commit.commit.tree &&
      branch.commit.commit.tree.sha
    ) {
      const treeSha = branch['commit']['commit']['tree']['sha']
      const tree = await githubApi.getTree(
        owner,
        repo,
        treeSha,
        true // recursive bool
      )
      this.setState({ tree, working: false })
    }
  }

  RepoContents = () => {
    const { currentRepo, tree } = this.state
    if (tree) {
      const contents = tree.tree.map((file, k) => <li key={k}>
        {file.path}
      </li>)
      return <ul className="repo-list">
        <h3>Contents of {currentRepo} Repository</h3>
        <p>GitHub Tree SHA: {tree.sha}</p>
        <p>{tree.tree.length} total files</p>
        { contents }
      </ul>
    }
    else return null
  }

  render() {
    const { automateAuth, code, redirect, token, user, working } = this.state
    const onSuccess = response => {
      const { code } = response
      this.setState({ code, working: false })
    }
    const onFailure = response => console.error(response)

    if (redirect) return <Redirect to={redirect} />
    else return <div id="github">
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
              token && !user ? <React.Fragment>
                <div className={'well'}>ACCESS TOKEN: {token}</div>
              </React.Fragment> : null
            }
            { 
              user ? <React.Fragment>
                <div className={'well'}>USER LOGIN: {user.login}</div>
              </React.Fragment> : null
            }
            </div>

            {
              code || token ? <this.ApiFunctions /> : <React.Fragment>
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

            <this.BranchList />

            <this.RepoContents />

          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
