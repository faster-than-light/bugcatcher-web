import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import queryString from 'query-string'
import { Form, Icon, Table, TextArea } from 'semantic-ui-react'
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

export default class BulkGithub extends Component {
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

    return <div style={{padding: '0', textAlign: 'left'}}>

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
      <h2 style={{
        marginTop: 0, paddingTop: 0
      }}>Test Multiple GitHub Repositories</h2>
      <p>One <code>:owner/:repo</code> per line <i>(ex: <code>faster-than-light/bugcatcher-ci</code>)</i></p>
      <Form>
        <TextArea id='repo_list' type="text"
          placeholder=":owner/:repo&#xa;:owner/:repo&#xa;:owner/:repo"
          style={{ height: 222 }} />
        <StlButton onClick={this.fetchRepoList}>fetch</StlButton>
      </Form>
    </React.Fragment>

    // if (this.state.repos && !this.state.branches) {
    //   const repos = this.state.repos ? this.state.repos.map((repo, k) => <Table.Row key={k}>
    //     <Table.Cell><a onClick={() => this.getBranches(repo)}>
    //       {repo}
    //     </a></Table.Cell>
    //   </Table.Row>) : <Table.Row key={0}>
    //     <Table.Cell>Not found.</Table.Cell>
    //   </Table.Row>
    //   return <div className="repo-list">
    //     <div style={{
    //       width: 'auto',
    //       float: 'right',
    //       paddingTop: 15,
    //     }}>
    //       Sort:&nbsp;
    //       <select onChange={this.sortOptionChange}>
    //         <option value={'full_name'}
    //           selected={this.state.sortReposBy === 'full_name'}>name</option>
    //         <option value={'created'}
    //           selected={this.state.sortReposBy === 'created'}>created</option>
    //         <option value={'updated'}
    //           selected={this.state.sortReposBy === 'updated'}>updated</option>
    //         <option value={'pushed'}
    //           selected={this.state.sortReposBy === 'pushed'}>pushed</option>
    //       </select>&nbsp;
    //       <select onChange={this.sortDirectionChange}>
    //         <option value={'asc'}
    //           selected={this.state.sortReposDirection === 'asc'}>asc</option>
    //         <option value={'desc'}
    //           selected={this.state.sortReposDirection === 'desc'}>desc</option>
    //       </select>
    //     </div>
    //     <h3>Your Repositories</h3>
    //     <Table celled striped className={'data-table'}>
    //       <Table.Body>
    //         { repos }
    //       </Table.Body>
    //     </Table>

    //     {specifyRepo}
    //   </div>
    // }
    // else return null
    return specifyRepo
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

  getBranches = async repoList => {
    window.scrollTo({ top: 0 })
    this.setState({ working: true })
    const [ owner, repo ] = repoList.split('/')
    let branches = await githubApi.getBranches(owner, repo)
    branches = branches.map(b => b.name)
    this.setState({ branches, working: false })
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
    newProjectPath = '/project/' + newProjectPath.replace(/\//g,'%2F')
    if (tree) newProjectPath += '?gh=' + tree.sha
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

  fetchRepoList = async () => {
    let repoList = document.getElementById("repo_list").value
    repoList = repoList.split('\n').filter(r => r.length)
    /** @todo: Build a data table with branch options, etc. */
    const [ owner, repo ] = repoList[0].split('/')
    let branches = await githubApi.getBranches(owner, repo)
    branches = branches.map(b => b.name)
    this.setState({
      branches,
      currentRepo: repoList[0],
      repoList,
      working: false
    })
  }

  LoadingRepos = () => {
    return this.state.token && !this.state.repos && !this.state.working ?
      <Loader active inline='centered' size='large' /> : <this.RepoList />
  }

  render() {
    const {
      code,
      redirect,
      token,
      working,
    } = this.state

    if (redirect) return <Redirect to={redirect} />
    else return <div id="github">
      <Menu />
      <FtlLoader show={working} text="working" />
      <div style={{
        maxWidth: 720,
        margin: '150px auto',
      }}>
        <div className="white-block" style={{ textAlign: 'center', padding: 18 }}>
          <div className="block-content">

            {
              code || token ? <this.ApiFunctions /> : <React.Fragment>
                <p>
                  <a href={`https://github.com/login/oauth/authorize?client_id=${github.clientId}&type=user_agent&scope=user,repo&redirect_uri=${appUrl}/gh_auth`}>
                    <StlButton className="big"
                    onClick={
                      () => { this.setState({ working: true }) }
                    }>Connect BugCatcher to GitHub</StlButton>
                  </a>
                </p>

                <label htmlFor="automate" style={{ zoom: 1.2, display: 'none' }} className="well">
                  <input id="automate" type="checkbox" onChange={this.toggleAutomateOption}
                    checked={this.state.automateAuth} />
                  &nbsp;Automate all steps of the authentication process
                </label>

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
