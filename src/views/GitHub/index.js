import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import queryString from 'query-string'
import { Icon, Input, Table } from 'semantic-ui-react'
import { Loader } from 'semantic-ui-react'

// components
import FtlLoader from '../../components/Loader'
import Menu from '../../components/Menu'

// helpers
import { appUrl, github } from '../../config'
import { getCookie, setCookie } from '../../helpers/cookies'
import githubApi from '../../helpers/githubApi'

// images & styles
import bugcatcherShield from '../../assets/images/bugcatcher-shield-square.png'
import githubLogo from '../../assets/images/github-logo.png'
import StlButton from '../../components/StlButton'
import '../../assets/css/Github.css'

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
const { automateCookieName, tokenCookieName } = github

export default class GitHub extends Component {
  constructor(props) {
    super(props)

    this.state = initialState

    this.toggleAutomateOption = this.toggleAutomateOption.bind(this)
    this.ApiFunctions = this.ApiFunctions.bind(this)
    this.RepoList = this.RepoList.bind(this)
    this.LoadingRepos = this.LoadingRepos.bind(this)
    this._getTree = githubApi.getTree.bind(this)
  }

  async componentWillMount() {
    this.setState({ working: true })
    const code = queryString.parse(document.location.search)['code']
    const cqc = queryString.parse(document.location.search)['cqc']
    let token = getCookie(tokenCookieName)
    token = token.length ? token : null

    if (cqc) this.setState({ redirect: `/cqc?code=${code}`})
    else {
      let { user } = this.state
      if (!token && code) {
        token = await this.fetchToken()
        if (window.history.pushState) {
          const newurl = `${window.location.protocol}//${window.location.host}/github`
          window.history.pushState({path: newurl}, '', newurl)
        }
      }
      if (token) {
        await githubApi.setToken(token)
        user = await this.fetchUser()
      }
      this.setState({
        code: !user && code ? code : null,
        token,
        user,
        working: false,
      })
    }
  }

  componentDidMount() {
    document.addEventListener("keydown", this.fetchRepoKeydownEvent)
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.fetchRepoKeydownEvent)
  }

  fetchRepoKeydownEvent = event => {
    if (
      event.target["id"] === 'custom_repo' && (
        event.code === 'Enter' || event.keyCode === 13
      )
    ) this.fetchCustomRepo()
  }
  
  async toggleAutomateOption(event) {
    const automate = event.target.checked
    await setCookie(automateCookieName, automate)
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
    this.runApiFunctions()
    return null
  }
  
  fetchToken = async alertError => {
    let token
    try {
      const getAccessToken = await githubApi.getAccessToken(this.state.code)
      token = getAccessToken['token']
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
      <StlButton onClick={this.fetchCustomRepo}>Fetch Branches</StlButton>
      <div className="error">{this.state.fetchCustomRepoError}</div>
    </React.Fragment>

    if (this.state.repos && !this.state.branches) {
      const repos = this.state.repos ? this.state.repos.map((repo, k) => <Table.Row key={k}>
        <Table.Cell><a onClick={() => this.getBranches(repo)}>
          {repo.full_name}
        </a></Table.Cell>
      </Table.Row>) : <Table.Row key={0}>
        <Table.Cell>Not found.</Table.Cell>
      </Table.Row>
      return <div className="repo-list">
        {specifyRepo}
        <hr />
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
    if (typeof currentRepo === 'object') {
      window.scrollTo({ top: 0 })
      this.setState({ working: true })
      const [ owner, repo ] = currentRepo.full_name.split('/')
      let branches = await githubApi.getBranches(owner, repo)
      branches = branches.map(b => b.name)
      this.setState({ branches, currentRepo, working: false })
    }
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
        <h3>Choose a branch of <code>{this.state.currentRepo.full_name}</code></h3>
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
    const [ owner, repo ] = this.state.currentRepo.full_name.split('/')
    const data = await this._getTree(
      owner,
      repo,
      branchName,
    )
    this.setState({ ...data, working: false })
  }

  RepoContents = () => {
    const { branchName, currentRepo, showFiles, tree } = this.state
    let newProjectPath = currentRepo && branchName ? `${currentRepo.full_name}/${branchName}` : ''
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
        <h3 style={{ padding: 0 }}>GitHub Repo: <code>{currentRepo.full_name}</code></h3>
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
    this.setState({ fetchCustomRepoError: null })
    const badPatternError = new Error('The :owner/:repo pattern is not valid.')
    const currentRepo = document.getElementById("custom_repo").value
    const throwError = err => {
      err = err || new Error(`There was an error fetching branches for \`${currentRepo}\``)
      console.error(err)
      this.setState({
        fetchCustomRepoError: err.message
      })
    }
    if (!currentRepo) return throwError(new Error('No :owner/:repo pattern was entered.'))

    if ((currentRepo.match(/\//g) || []).length !== 1) return throwError(badPatternError)
    const [ owner, repo ] = currentRepo.split('/')
    if (!owner || !repo) return throwError(badPatternError)
    
    let branches = await githubApi.getBranches(owner, repo.name).catch(e => { return throwError(e) })
    if (!branches) return throwError(new Error(`No branches were found for \`${currentRepo}\``))
    
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

            {/* {
              !code && !token ? null :
                <Link to={'/github'}
                  onClick={this.resetState}
                  style={{float: 'left'}}>&laquo; start over</Link>
            } */}

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

            {
              code || token ? <this.ApiFunctions /> : <React.Fragment>
                <p>
                  <a href={`https://github.com/login/oauth/authorize?client_id=${github.clientId}&type=user_agent&scope=user%3Aemail%2Crepo&redirect_uri=${appUrl}/github/gh_auth`}>
                    <StlButton className="big"
                    onClick={
                      () => { this.setState({ working: true }) }
                    }>Browse GitHub Repos</StlButton>
                  </a>
                </p>

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
