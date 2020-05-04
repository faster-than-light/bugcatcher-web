import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import queryString from 'query-string'
import { Icon, Input, Table } from 'semantic-ui-react'
import { Loader } from 'semantic-ui-react'

// components
import FtlLoader from '../../../components/Loader'
import Menu from '../../../components/Menu'
import StlButton from '../../../components/StlButton'

// helpers
import api from '../../../helpers/api'
import { appUrl, github } from '../../../config'
import { getCookie, setCookie } from '../../../helpers/cookies'
import { uriDecodeProjectName } from '../../../helpers/strings'
import githubApi from '../../../helpers/githubApi'

// images & styles
import bugcatcherShield from '../../../assets/images/bugcatcher-shield-square.png'
import githubLogo from '../../../assets/images/github-logo.png'
import '../../../assets/css/Github.css'

/** Constants */
const initialState = {
  code: null,
  currentRepo: null,
  branches: null,
  branchName: null,
  projects: null,
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

export default class Repositories extends Component {
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
    const { data } = await api.getProject().catch(() => null)
    const projects = data['response']
    this.setState({ projects, working: true })
    const code = queryString.parse(document.location.search)['code']
    let token = getCookie(tokenCookieName)
    token = token.length ? token : null

    let { user } = this.state
    if (!token && code) {
      token = await this.fetchToken()
      if (window.history.pushState) {
        const newurl = `${window.location.protocol}//${window.location.host}/github/repos`
        window.history.pushState({path: newurl}, '', newurl)
      }
    }
    if (token) {
      await githubApi.setToken(token)
      user = await this.fetchUser(true)
    }
    if (!token && !user && !code) this.props.setUser(null)
    else this.setState({
      addingProjects: projects && !projects.length,
      code: !user && code ? code : null,
      token,
      user,
      working: false,
    })

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
    if (!user) await this.fetchUser(true)
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
    let user = await githubApi.getAuthenticated() 
      .catch(e => { console.error(e);return null })
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

  RepoList = () => {
    let { addingProjects, branches, branchName, projects, repos } = this.state

    if (projects && repos && !branches) {
      const ProjectsRows = projects.map((project, k) => {
        const wasTested = repos.find(r => {
          return project.startsWith(r.full_name.replace(/\//g, '%2F') + '%2Ftree%2F')
        })
        if (wasTested) return null
        const clickFn = () => { this.setState({ redirect: `/project/${project}` }) }
        return <Table.Row key={k} style={{ display: !wasTested || addingProjects ? 'block' : 'none' }}>
          <Table.Cell style={{ borderLeft: !wasTested ? '6px solid #2185d0' : 'normal', width: '100%', display: 'block' }}>
            
              <StlButton onClick={clickFn} semantic primary
                className="small" style={{
                  float: 'right',
                  display: !wasTested ? 'none' : 'inline-block'
                }}><Icon name="add" />&nbsp;Add</StlButton>
              <Icon name={!wasTested ? 'code' : 'code branch'} style={{ color: !wasTested ? '#2185d0' : 'inherit' }} />&nbsp;
              <a onClick={clickFn}>{project}</a>
          </Table.Cell>
        </Table.Row>
      })

      const RepoRows = repos.map((repo, k) => {
        const wasTested = projects.find(p => p.startsWith(repo.full_name.replace(/\//g, '%2F') + '%2Ftree%2F'))
        const clickFn = !wasTested ? () => { this.getBranches(repo) } : () => { this.setState({ redirect: `/project/${encodeURIComponent(wasTested)}`}) }
        return <Table.Row key={k} style={{ display: (wasTested || addingProjects) ? 'block' : 'none' }}>
          <Table.Cell style={{
              borderLeft: wasTested ? '6px solid #2185d0' : 'normal',
              width: '100%',
              display: 'block',
              color: '#666',
            }}>
            
              <StlButton onClick={clickFn} semantic
                className="small" style={{
                  float: 'right',
                  display: wasTested ? 'none' : 'inline-block'
                }}><Icon name="add" />&nbsp;Add</StlButton>
              <Icon name={wasTested ? 'code branch' : 'code branch'} style={{ color: wasTested ? '#2185d0' : 'inherit' }} />&nbsp;
              
              {
                wasTested ? <a onClick={clickFn}>{repo.full_name}</a> : repo.full_name
              }
              
          </Table.Cell>
        </Table.Row>
      })

      return <div className="repo-list">
        {/* {specifyRepo}
        <hr /> */}
        {/* <div style={{
          width: 'auto',
          float: 'right',
          // paddingTop: 15,
        }}>
          Sort:&nbsp;
          <select onChange={this.sortOptionChange} defaultValue="full_name">
            <option value={'full_name'}>name</option>
            <option value={'created'}>created</option>
            <option value={'updated'}>updated</option>
            <option value={'pushed'}>pushed</option>
          </select>&nbsp;
          <select onChange={this.sortDirectionChange} defaultValue="asc">
            <option value={'asc'}>asc</option>
            <option value={'desc'}>desc</option>
          </select>
        </div> */}
        <h2 style={{ margin: 0, padding: 0 }}>Projects</h2>
        {
          projects && !projects.length ? <p className="well">
            You have no projects configured. Please add a GitHub project below, or upload a project using the &quot;Upload Project&quot; button.
          </p> : null
        }
        <Table celled striped className={'data-table'}>
          <Table.Body>
            { RepoRows }
            { ProjectsRows }
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
    const { default_branch: defaultBranch, full_name: fullName } = currentRepo
    console.log(currentRepo)
    window.scrollTo({ top: 0 })
    this.setState({ working: true })
    const [ owner, repo ] = fullName.split('/')
    let branches = await githubApi.getBranches(owner, repo)
    branches = branches.map(b => b.name)
    this.setState({ branches, currentRepo: fullName })
    this.getTree(defaultBranch)
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
    const { branches, branchName, currentRepo, showFiles, tree } = this.state
    if (tree) {
      let newProjectPath = `${this.state.currentRepo}/tree/${this.state.branchName}`
      newProjectPath = '/project/' + newProjectPath.replace(/\//g,'%2F')
      newProjectPath += '?gh=' + tree.sha
      this.setState({
        redirect: newProjectPath
      })
      return null
      // const contents = tree.tree && tree.tree.length ? tree.tree.map((t, k) => 
      // <Table.Row key={k}>
      //   <Table.Cell>
      //     { t.path }
      //   </Table.Cell>
      // </Table.Row>) : <Table.Row key={0}>
      //   <Table.Cell>Not found.</Table.Cell>
      // </Table.Row>
      // return <div className="repo-list">
      //   <h3 style={{ padding: 0 }}>GitHub Repo: <code>{currentRepo}</code></h3>
      //   <h3 style={{ padding: 0, margin: 0 }}>Branch: <select ref={r => this.selectedBranch = r}
      //     onChange={() => {
      //       this.setState({branchName: this.selectedBranch.value})
      //   }}>{
      //     branches.map(b => {
      //       return <option selected={b === branchName}>{b}</option>
      //     })
      //   }</select></h3>
      //   <p style={{ marginTop: 15 }}>GitHub Tree SHA: <code>{tree.sha}</code></p>
      //   <p>
      //     {tree.tree.filter(t => t.type === 'blob').length} total files &nbsp;
      //     <a onClick={() => { this.setState({ showFiles: !showFiles })}}>
      //       show / hide
      //     </a>
      //   </p>
      //   <Table celled striped className={'data-table'}
      //     style={{ display: !showFiles ? 'none' : 'table' }}>
      //     <Table.Body>
      //       { contents }
      //     </Table.Body>
      //   </Table>
      //   <StlButton semantic onClick={() => { this.setState({branches: null, tree: null}) }}>&laquo; back</StlButton>
      //   &nbsp;
      //   <Link to={newProjectPath}>
      //     <StlButton semantic primary onClick={this.testRepo}>Test This GitHub Repo &raquo;</StlButton>
      //   </Link>
      // </div>
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
    
    let branches = await githubApi.getBranches(owner, repo).catch(e => { return throwError(e) })
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
      addingProjects,
      addNewProject,
      branches,
      code,
      projects,
      redirect,
      repos,
      token,
      user,
      working,
    } = this.state
    // console.log(this.state)
    // const onSuccess = response => {
    //   const { code } = response
    //   this.setState({ code, working: false })
    // }
    // const onFailure = response => console.error(response)

    if (redirect) return <Redirect to={redirect} />
    else if (working) return <FtlLoader show={true} text={'working'} />
    else if (!code && !token) return <FtlLoader show={true} />
    else if (addNewProject) return <Redirect to={`/code/${addNewProject}`} />
    else return <div id="github">
      <Menu />
      <FtlLoader show={working} text="working" />
      <div className="ftl-section" style={{
        // maxWidth: 720,
        margin: 'auto',
        marginTop: 18,
        paddingRight: 30,
      }}>
        <StlButton style={{
            clear: 'both',
            float: 'right',
            // marginRight: 30,
            marginBottom: 12,
            display: addingProjects || branches ? 'none' : 'inline-block'
          }}
          semantic
          primary
          className="small"
          onClick={() => {
            this.setState({ addingProjects: true })
          }}>
          <Icon name="add" />
          Add Project
        </StlButton>
        <StlButton style={{
            clear: 'both',
            float: 'right',
            // marginRight: 30,
            marginBottom: 12,
            display: addingProjects && projects && projects.length && !branches ? 'inline-block' : 'none'
          }}
          semantic
          className="small"
          onClick={() => {
            this.setState({ addingProjects: false })
          }}>
          Done
        </StlButton>
        <StlButton style={{
            float: 'right',
            marginRight: 6,
            marginBottom: 12,
            display: addingProjects && !branches ? 'inline-block' : 'none'
          }}
          semantic
          primary
          className="small"
          onClick={() => {
            let projectName = prompt('Please create a name for your project.')
            // projectName = cleanProjectName(projectName)
            if (projectName && projectName.length) this.setState({
              addNewProject: encodeURIComponent(
                projectName.trim().replace(/\s\s+/g, ' ')
              )
            })
          }}>
          Upload Project
        </StlButton>
        <div className="white-block" style={{ clear: 'both', textAlign: 'center', padding: 18 }}>
          <div className="block-content">

            {/* {
              !code && !token ? null :
                <Link to={'/github'}
                  onClick={this.resetState}
                  style={{float: 'left'}}>&laquo; start over</Link>
            } */}

            {/* <h2>Test Your GitHub Repos</h2>

            <p className="oauth-images">
              <img src={bugcatcherShield} alt="BugCatcher" />
              <div className="center-check">
                <div className="icon-box">
                  <Icon name="chevron circle right" size="big" style={{ color: 'green' }} />
                </div>
              </div>
              <img src={githubLogo} alt="GitHub" />
            </p> */}

            {
              code || token ? <this.ApiFunctions /> : null
            }
            {/* <React.Fragment>
                <p>
                  <a href={`https://github.com/login/oauth/authorize?client_id=${github.clientId}&type=user_agent&scope=user%3Aemail%2Crepo&redirect_uri=${appUrl}/github/gh_auth`}>
                    <StlButton className="big"
                    onClick={
                      () => { this.setState({ working: true }) }
                    }>Browse GitHub Repos</StlButton>
                  </a>
                </p>

              </React.Fragment> */}

            <this.LoadingRepos />

            {/* <this.BranchList /> */}

            <this.RepoContents />

          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
