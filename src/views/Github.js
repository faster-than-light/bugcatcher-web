import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import queryString from 'query-string'
import { Icon, Input, Table } from 'semantic-ui-react'
import { Loader } from 'semantic-ui-react'

// components
import FtlLoader from '../components/Loader'
import Menu from '../components/Menu'

// helpers
import { appUrl, github } from '../config'
import { getCookie, setCookie } from '../helpers/cookies'
import githubApi from '../helpers/githubApi'

// images & styles
import bugcatcherShield from '../assets/images/bugcatcher-shield-square.png'
import githubLogo from '../assets/images/github-logo.png'
import StlButton from '../components/StlButton'
import '../assets/css/Github.css'

/** Constants */
const initialState = {
  code: null,
  currentRepo: null,
  branches: null,
  branchName: null,
  redirect: null,
  repos: null,
  sortReposBy: 'full_name',
  sortReposDirection: 'asc',
  token: null,
  tree: null,
  user: null,
  working: false,
}
const automateCookieName = 'automate-gh_auth'
const tokenCookieName = 'github-ftl-token'

export default class Github extends Component {
  constructor(props) {
    super(props)

    let token = getCookie(tokenCookieName)
    token = token.length ? token : null
    this.state = {
      ...initialState,
      automateAuth: true,
      // automateAuth: getCookie(automateCookieName) == 'true',
      token,
    }

    this.toggleAutomateOption = this.toggleAutomateOption.bind(this)
    this.ApiFunctions = this.ApiFunctions.bind(this)
    this.RepoList = this.RepoList.bind(this)
    this.LoadingRepos = this.LoadingRepos.bind(this)
    this._getTree = githubApi.getTree.bind(this)
  }

  async componentWillMount() {
    this.setState({ working: true })
    const code = queryString.parse(document.location.search)['code']
    let { token, user } = this.state
    if (!token && code) {
      token = await this.fetchToken()
    }
    if (token) {
      await githubApi.setToken(token)
      user = await this.fetchUser()
    }
    this.setState({
      code: !user && code ? code : null,
      user,
      working: false,
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
    if (automateAuth) {
      this.runApiFunctions()
    }
    return this.ApiButtons()
  }
  
  ApiButtons = () => {
    const { automateAuth } = this.state
    const show = { display: !automateAuth ? 'inline-block' : 'none' }

    return <div style={{padding: '21px 0', textAlign: 'left'}}>

      <this.FetchAccessToken style={show} />

      <this.FetchUserProfile style={show} />

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
    try {
      repos = await githubApi.getRepos(
        this.state.sortReposBy,
        this.state.sortReposDirection
      )
    }
    catch(e) { console.error(e) }
    if (!repos && alertError) alert("There was a problem fetching your Repository List. Please start over and try again.")
    else this.setState({ repos, contents: null })
    return repos
  }

  FetchAccessToken = (props) => <StlButton primary semantic disabled={Boolean(this.state.token)}
    style={props.style}
    onClick={async () => {
      this.setState({ working: true })
      await this.fetchToken(true)
      this.setState({ working: false }) 
    }}>Fetch Access Token &laquo;</StlButton>

  FetchUserProfile = (props) => <StlButton primary semantic
    disabled={Boolean(!this.state.token || this.state.user)}
    style={props.style}
    onClick={ async () => {
      this.setState({ working: true })
      await this.fetchUser(true)
      this.setState({ working: false })
    }}>Fetch User Profile &raquo;</StlButton>

  FetchUserRepos = () => <StlButton className="link"
    style={{ fontSize: 21, padding: 0,
      display: Boolean(!this.state.user || !this.state.branches) ?
      'none' : 'block' }}
    onClick={ async () => {
      this.setState({ branches: null, tree: null, working: true })
      await this.fetchRepos()
      this.setState({ working: false })
    }}>&laquo; Back to Repository List</StlButton>

  RepoList = () => {
    const specifyRepo = <React.Fragment>
      <h3>Specify a Repo</h3>
      <Input id='custom_repo' type="text" placeholder=":owner/:repo" />
      <StlButton onClick={this.fetchCustomRepo}>fetch</StlButton>
    </React.Fragment>

    if (this.state.repos && !this.state.branches) {
      const repos = this.state.repos ? this.state.repos.map((repo, k) => <Table.Row key={k}>
        <Table.Cell><a onClick={() => this.getBranches(repo)}>
          {repo}
        </a></Table.Cell>
      </Table.Row>) : <Table.Row key={0}>
        <Table.Cell>Not found.</Table.Cell>
      </Table.Row>
      return <div className="repo-list">
        <div style={{
          width: 'auto',
          float: 'right',
          paddingTop: 15,
        }}>
          Sort:&nbsp;
          <select onChange={this.sortOptionChange}>
            <option value={'full_name'}
              selected={this.state.sortReposBy === 'full_name'}>name</option>
            <option value={'created'}
              selected={this.state.sortReposBy === 'created'}>created</option>
            <option value={'updated'}
              selected={this.state.sortReposBy === 'updated'}>updated</option>
            <option value={'pushed'}
              selected={this.state.sortReposBy === 'pushed'}>pushed</option>
          </select>&nbsp;
          <select onChange={this.sortDirectionChange}>
            <option value={'asc'}
              selected={this.state.sortReposDirection === 'asc'}>asc</option>
            <option value={'desc'}
              selected={this.state.sortReposDirection === 'desc'}>desc</option>
          </select>
        </div>
        <h3>Your Repositories</h3>
        <Table celled striped className={'data-table'}>
          <Table.Body>
            { repos }
          </Table.Body>
        </Table>

        {specifyRepo}
      </div>
    }
    else return null
  }

  sortOptionChange = e => {
    const sortReposBy = e.target.value
    if (sortReposBy != this.state.sortReposBy) this.setState({
      sortReposBy,
      repos: null,
    })
  }

  sortDirectionChange = e => {
    const sortReposDirection = e.target.value
    if (sortReposDirection != this.state.sortReposDirection) this.setState({
      sortReposDirection,
      repos: null,
    })
  }

  getBranches = async currentRepo => {
    window.scrollTo({ top: 0 })
    this.setState({ working: true })
    const [ owner, repo ] = currentRepo.split('/')
    let branches = await githubApi.getBranches(owner, repo)
    branches = branches.map(b => b.name)
    this.setState({ branches, currentRepo, working: false })
  }

  BranchList = () => {
    if (this.state.branches && !this.state.tree) {
      const branches = this.state.branches.length ? this.state.branches.map((branch, k) => 
      <Table.Row key={k}>
        <Table.Cell>
          <a onClick={() => { this.getTree(branch) }}>{branch}</a>
        </Table.Cell>
      </Table.Row>) : <Table.Row key={0}>
        <Table.Cell>Not found.</Table.Cell>
      </Table.Row>
      return <div className="repo-list">
        <h3>Choose a branch of <code>{this.state.currentRepo}</code></h3>
        <Table celled striped className={'data-table'}>
          <Table.Body>
            { branches }
          </Table.Body>
        </Table>
      </div>
    }
    else return null
  }

  getTree = async branchName => {
    window.scrollTo({ top: 0 })
    this.setState({ working: true })
    const [ owner, repo ] = this.state.currentRepo.split('/')
    const data = await this._getTree(
      owner,
      repo,
      branchName,
    )
    this.setState({ ...data, working: false })
  }

  RepoContents = () => {
    const { branchName, currentRepo, showFiles, tree } = this.state
    let newProjectPath = `${this.state.currentRepo}/${this.state.branchName}`
    newProjectPath = '/project/' + newProjectPath.replace(/\//g,'%2F') + '?gh=1'
    if (tree) {
      const contents = tree.tree && tree.tree.length ? tree.tree.map((t, k) => 
      <Table.Row key={k}>
        <Table.Cell>
          { t.path }
        </Table.Cell>
      </Table.Row>) : <Table.Row key={0}>
        <Table.Cell>Not found.</Table.Cell>
      </Table.Row>
      return <div className="repo-list">
        <h3 style={{ padding: 0 }}>GitHub Repo: <code>{currentRepo}</code></h3>
        <h3 style={{ padding: 0, margin: 0 }}>Branch: <code>{branchName}</code></h3>
        <p style={{ marginTop: 15 }}>GitHub Tree SHA: <code>{tree.sha}</code></p>
        <p>
          {tree.tree.filter(t => t.type === 'blob').length} total files &nbsp;
          <a onClick={() => { this.setState({ showFiles: !showFiles })}}>
            show / hide
          </a>
        </p>
        <Table celled striped className={'data-table'}
          style={{ display: !showFiles ? 'none' : 'table' }}>
          <Table.Body>
            { contents }
          </Table.Body>
        </Table>
        <Link to={newProjectPath}>
          <StlButton onClick={this.testRepo}>Test This GitHub Repo</StlButton>
        </Link>
      </div>
    }
    else return null
  }

  fetchCustomRepo = async () => {
    const currentRepo = document.getElementById("custom_repo").value
    const [ owner, repo ] = currentRepo.split('/')
    let branches = await githubApi.getBranches(owner, repo)
    branches = branches.map(b => b.name)
    this.setState({
      branches,
      currentRepo,
      working: false
    })
  }

  LoadingRepos = () => {
    return this.state.token && !this.state.repos && !this.state.working ?
      <Loader active inline='centered' size='large' /> : <this.RepoList />
  }

  render() {
    const {
      automateAuth,
      code,
      redirect,
      repos,
      token,
      user,
      working,
    } = this.state
    const onSuccess = response => {
      const { code } = response
      this.setState({ code, working: false })
    }
    const onFailure = response => console.error(response)

    if (redirect) return <Redirect to={redirect} />
    else return <div id="github">
      <Menu />
      <FtlLoader show={working} text="working" />
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

            <h2>Test Your GitHub Repos</h2>

            <p className="oauth-images">
              <img src={bugcatcherShield} alt="BugCatcher" />
              <div className="center-check">
                <div className="icon-box">
                  <Icon name="chevron circle right" size="big" style={{ color: 'green' }} />
                </div>
              </div>
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
                    }>Connect BugCatcher to GitHub</StlButton>
                  </a>
                  {/* <GitHubLogin className="big btn"
                    clientId={github.clientId}
                    redirectUri=''
                    scope="user repo"
                    buttonText="Option 2&raquo;In New Tab"
                    onSuccess={onSuccess}
                    onFailure={onFailure}/> */}
                </p>

                <label htmlFor="automate" style={{ zoom: 1.2, display: 'none' }} className="well">
                  <input id="automate" type="checkbox" onChange={this.toggleAutomateOption}
                    checked={this.state.automateAuth} />
                  &nbsp;Automate all steps of the authentication process
                </label>

                {/* <ul style={{textAlign: 'left', margin: 18}}>
                  <li>Option 1 is redirecting you straight to Github in this window.</li>
                  <li>Option 2 is using a React JS component library to use a new window/tab to log in.</li>
                </ul>
                <p>Both options result in a temporary <code>code</code> being returned from GitHub. This code can be used with the GitHub API for 10 minutes to retrieve an <code>Access Token</code>. The access token can then be used to interact with GitHub on behalf of the user for 1 hour or until the user logs out of GitHub.</p> */}
              </React.Fragment>
            }

            <this.LoadingRepos />

            <this.BranchList />

            <this.RepoContents />

          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
