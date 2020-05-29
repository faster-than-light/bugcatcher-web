import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'
import queryString from 'query-string'
import { Icon, Input, Table } from 'semantic-ui-react'

// components
import FtlLoader from '../../../components/Loader'
import Menu from '../../../components/Menu'
import StlButton from '../../../components/StlButton'

// context
import { UserContext } from '../../../contexts/UserContext'

// helpers
import api from '../../../helpers/api'
import { github, projectIconNames, projectIconTitles } from '../../../config'
import { getCookie, setCookie } from '../../../helpers/cookies'
import { destructureProjectName, uriEncodeProjectName } from '../../../helpers/strings'
import githubApi from '../../../helpers/githubApi'

// images & styles
import githubText from '../../../assets/images/github.png'
import githubLogo from '../../../assets/images/github-logo.png'
import githubLogoWhite from '../../../assets/images/github-logo-inverted.png'
import '../../../assets/css/Github.css'
import CqcApi from '../../../helpers/cqcApi'

/** Constants */
const cqcApi = CqcApi(getCookie("session"))
const initialState = {
  code: null,
  currentRepo: null,
  branches: null,
  branchName: null,
  githubUser: null,
  projects: null,
  redirect: null,
  repos: null,
  sortReposBy: 'full_name',
  sortReposDirection: 'asc',
  token: null,
  tree: null,
  working: false,
}
const { automateCookieName, tokenCookieName } = github

export default class Repositories extends Component {
  static contextType = UserContext

  constructor(props) {
    super(props)

    this.state = initialState

    this.toggleAutomateOption = this.toggleAutomateOption.bind(this)
    this._getTree = githubApi.getTree.bind(this)
  }

  async componentWillMount() {
    const { data = {} } = await api.getProject().catch(() => ({}))
    const projects = data['response']
    this.setState({ projects, working: true })
    const code = queryString.parse(document.location.search)['code']
    let token = getCookie(tokenCookieName)
    token = token.length ? token : null

    let { githubUser } = this.state
    if (!token && code) {
      token = await this.fetchToken()
      if (window.history.pushState) {
        const newurl = `${window.location.protocol}//${window.location.host}/github/repos`
        window.history.pushState({path: newurl}, '', newurl)
      }
    }
    if (token) {
      await githubApi.setToken(token)
      githubUser = await this.fetchGithubUser()
    }
    if (!token && !githubUser && !code) this.props.setUser(null)
    else this.setState({
      addingProjects: projects && !projects.length,
      code: !githubUser && code ? code : null,
      token,
      githubUser,
      working: false,
    })

    this.runApiFunctions()

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
    const { code, repos, token, githubUser, webhookSubscriptions } = this.state
    if (code && !token) await this.fetchToken()
    // if (!githubUser) await this.fetchGithubUser()
    if (!repos) await this.fetchRepos()
    if (!webhookSubscriptions) await this.fetchWebhookSubscriptions()
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

  fetchGithubUser = async alertError => {
    let githubUser = await githubApi.getAuthenticated() 
      .catch(e => { console.error(e);return null })
    if (!githubUser) {
      if (alertError) alert("There was a problem fetching your Profile. Please start over and try again.")
      this.resetState()
    }
    else this.setState({ githubUser })
    return githubUser
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
    else this.setState({ repos })
    return repos
  }

  fetchWebhookSubscriptions = async alertError => {
    let retries = 0, webhookSubscriptions
    const q = cqcApi.getWebhookSubscriptions(
      this.props.user
    )
    const catchFn = async () => {
      webhookSubscriptions = await q.catch(fetchWebhooks)
      return webhookSubscriptions
    }
    const fetchWebhooks = () => {
      if (retries > 4) this.context.actions.logOut()
      retries++
      setTimeout(() => {
        return catchFn()
      }, 999)
    }
    webhookSubscriptions = await q.catch(fetchWebhooks)
    
    if (!webhookSubscriptions && alertError) alert("There was a problem fetching your Repository List. Please start over and try again.")
    else this.setState({ webhookSubscriptions })
    return webhookSubscriptions
  }

  FetchAccessToken = (props) => <StlButton primary semantic disabled={Boolean(this.state.token)}
    style={props.style}
    onClick={async () => {
      this.setState({ working: true })
      await this.fetchToken(true)
      this.setState({ working: false }) 
    }}>Fetch Access Token &laquo;</StlButton>

  // FetchUserProfile = (props) => <StlButton primary semantic
  //   disabled={Boolean(!this.state.token || this.state.githubUser)}
  //   style={props.style}
  //   onClick={ async () => {
  //     this.setState({ working: true })
  //     await this.fetchGithubUser()
  //     this.setState({ working: false })
  //   }}>Fetch User Profile &raquo;</StlButton>

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
    this.setState({ working: true })
    const [ owner, repo ] = fullName.split('/')
    let branches = await githubApi.getBranches(owner, repo)
    branches = branches.map(b => b.name)
    this.setState({ branches, currentRepo: fullName })
    this.getTree(defaultBranch)
  }

  getTree = async branchName => {
    this.setState({ working: true })
    const [ owner, repo ] = this.state.currentRepo.split('/')
    const data = await this._getTree(
      owner,
      repo,
      branchName,
    )
    this.setState({ ...data, working: false })
  }

  showEphemeralFetchError = (errMessage) => {
    this.setState({
      fetchCustomRepoError: errMessage
    })
    setTimeout(() => {
      this.setState({
        fetchCustomRepoError: null
      })
    }, 6000)
  }

  fetchCustomRepo = async () => {
    this.setState({ fetchCustomRepoError: null })
    const badPatternError = new Error('The :owner/:repo pattern is not valid.')
    const customRepo = document.getElementById("custom_repo").value
    const throwError = err => {
      err = err || new Error(`There was an error fetching branches for \`${customRepo}\``)
      console.error(err)
      this.showEphemeralFetchError(err.message)
    }
    if (!customRepo) return throwError(new Error('No :owner/:repo pattern was entered.'))

    if ((customRepo.match(/\//g) || []).length !== 1) return throwError(badPatternError)
    const [ owner, repo ] = customRepo.split('/')
    if (!owner || !repo) return throwError(badPatternError)
    
    const { data: fetchedRepo } = await githubApi.octokit.repos.get({
      owner,
      repo
    }).catch(() => ({}))

    if (!fetchedRepo) this.showEphemeralFetchError('Repo was not found')
    else this.getBranches(fetchedRepo)

  }

  AddProjects = () => {
    let { addingProjects, fetchCustomRepo, fetchCustomRepoError } = this.state

    if (!addingProjects) return null

    else if (fetchCustomRepo) return <div style={{
      float: 'right',
      paddingBottom: 12,
      verticalAlign: 'middle',
    }}>
      <Input id="custom_repo"
        ref={r => this.customRepoInput = r}
        style={{
          verticalAlign: 'middle',
        }}
        placeholder=":owner/:repo" />
      <StlButton className="github-button"
        style={{
          verticalAlign: 'middle',
          marginLeft: 9,
        }}
        onClick={this.fetchCustomRepo}>
          <img src={githubLogoWhite} alt="GitHub Logo" />&nbsp;
          Add Repo
      </StlButton>
      <StlButton semantic style={{
        verticalAlign: 'middle',
        marginLeft: 9,
      }}
      onClick={() => {
        this.setState({ fetchCustomRepo: null })
      }}>cancel</StlButton>
      <div className="error"
        style={{ display: fetchCustomRepoError ? 'block' : 'none' }}>{fetchCustomRepoError}</div>
    </div>

    else return <div>
      <StlButton style={{
          float: 'right',
          marginRight: 6,
          marginBottom: 12,
        }}
        semantic
        primary
        onClick={() => {
          let projectName = prompt('Please create a name for your project.')
          if (projectName && projectName.length) this.setState({
            addNewProject: encodeURIComponent(
              projectName.trim().replace(/\s\s+/g, ' ')
            )
          })
        }}>
          <Icon name="upload" />
          Upload Project
      </StlButton>
      <StlButton className="github-button"
          link
          style={{
          float: 'right',
          marginRight: 9,
        }}
        onClick={() => {
          this.setState({ fetchCustomRepo: true })
          setTimeout(() => {
            this.customRepoInput.focus()
          }, 333)
        }}>
          <Icon name="add" />
          Add Public&nbsp;&nbsp;
          <img src={githubLogo} alt="GitHub Logo" />
          <img src={githubText} alt="GitHub Text" />
          Repository
      </StlButton>
    </div>

  }
  
  RepoList = () => {
    let { addingProjects, branches, projects, repos, webhookSubscriptions } = this.state

    if (webhookSubscriptions && projects && repos && !branches) {

      let repoList = new Array()

      // Add rows for webhook results
      webhookSubscriptions.forEach(r => {
        const scanId = r['scan'] && r['scan']['_id'] ? r['scan']['_id'] : ''
        const branch = r.ref.replace('refs/heads/','')
        const projectName = encodeURIComponent(r.repository)
        const projectNameWithBranch = r.repository + '/tree/' + branch
        const display = !repoList.find(repo => repo[0] === r.repository)

        if (display) repoList.push([
          projectNameWithBranch,
          <Table.Row key={projectName}>
            <Table.Cell style={{ borderLeft: '6px solid #2185d0', width: '100%' }}>
              <Icon name={projectIconNames['webhook']}
                title={projectIconTitles['webhook']}
                style={{ color: '#2185d0' }} />&nbsp;
              <a onClick={() => {
                this.setState({ redirect: `/project/${encodeURIComponent(projectNameWithBranch)}?webhook=${scanId}`})
              }}>{r.repository}</a>
            </Table.Cell>
          </Table.Row>
        ])
      })

      // Add rows for github repos not found in webhook results
      repos.forEach(repo => {
        const projectName = encodeURIComponent(repo.full_name)
        const isInList = repoList.map(r => r[0]).includes(repo.full_name)
        const wasTested = projects.find(p => 
          p.startsWith(repo.full_name.replace(/\//g, '%2F') + '%2Ftree%2F')
        ) || isInList
        const clickFn = !wasTested ? () => { this.getBranches(repo) } : () => { this.setState({ redirect: `/project/${encodeURIComponent(wasTested)}`}) }
        const display = !wasTested && addingProjects

        if (display) repoList.push([
          repo.full_name,
          <Table.Row key={projectName}>
            <Table.Cell style={{
                borderLeft: wasTested ? '6px solid #2185d0' : 'normal',
                width: '100%',
                color: '#666',
              }}>
              
                <StlButton onClick={clickFn} semantic
                  className="small" style={{
                    float: 'right',
                    display: wasTested ? 'none' : 'inline-block'
                  }}><Icon name="add" />&nbsp;Add</StlButton>
                <Icon name={projectIconNames['repo']}
                  title={projectIconTitles['repo']}
                  style={{ color: wasTested ? '#2185d0' : 'inherit' }} />&nbsp;
                
                {
                  wasTested ? <a onClick={clickFn}>{repo.full_name}</a> : repo.full_name
                }
                
            </Table.Cell>
          </Table.Row>
        ]) 
      })

      // Add rows for projects not found in repoList
      const projectsAreReposWithoutHooks = projects.filter(p => {
        const [ owner, repo, branch ] = destructureProjectName(decodeURIComponent(p))
        return !webhookSubscriptions.map(w => w.repository).includes(`${owner}/${repo}`)
          && !webhookSubscriptions.map(w => w.ref).includes(`refs/heads/${branch}`)
      }).map(p => decodeURIComponent(p))

      projects.forEach((project, k) => {
        project = decodeURIComponent(project)
        const isInList = repoList.map(r => r[0]).includes(project)
        const isRepo = project.match('/tree/')
        const repoName = project.split('/tree/')[0]
        const isMyRepo = repos.find(r => {
          const name = decodeURIComponent(r.full_name)
          return project.startsWith(name + '/tree/')
        })

        if (
          projectsAreReposWithoutHooks.includes(project) 
          || (!isMyRepo && !isInList)
        ) {
          const clickFn = () => { this.setState({ redirect: `/project/${uriEncodeProjectName(project)}` }) }
          repoList.push([
            project,
            <Table.Row key={k}>
              <Table.Cell style={{ borderLeft: '6px solid #2185d0', width: '100%' }}>
                <Icon name={isRepo ? projectIconNames['repo'] : projectIconNames['upload']}
                  title={isRepo ? projectIconTitles['repo'] : projectIconTitles['upload']}
                  style={{ color: '#2185d0' }} />&nbsp;
                <a onClick={clickFn}>{repoName}</a>
              </Table.Cell>
            </Table.Row>
          ])
        }
      })

      return <div className="repo-list">
        <this.AddProjects />
        <h2 style={{ margin: 0, padding: 0 }}>Projects</h2>
        {
          !projects.length ? <p className="well">
            You have no projects configured. Please add a GitHub project, or upload a project using the &quot;Upload Project&quot; button.
          </p> : null
        }
        <Table celled striped className={'data-table'}>
          <Table.Body>
            { repoList.map(r => r[1]) }
            {/* { RepoRows }
            { ProjectsRows } */}
          </Table.Body>
        </Table>
      </div>
    
    }
    else return null
  }

  render() {
    let {
      addingProjects,
      addNewProject,
      branches,
      branchName,
      code,
      currentRepo,
      projects,
      redirect,
      repos,
      token,
      tree,
      webhookSubscriptions,
      working,
    } = this.state

    if (tree) {	
      let newProjectPath = `${currentRepo}/tree/${branchName}`	
      newProjectPath = '/project/' + newProjectPath.replace(/\//g,'%2F')	
      newProjectPath += '?gh=' + tree.sha	
      redirect = newProjectPath	
    }

    if (redirect) return <Redirect to={redirect} />
    else if (working || (!code && !token) || (token && (!webhookSubscriptions || !repos) && !working)) return <FtlLoader show={true} />
    else if (addNewProject) return <Redirect to={`/code/${addNewProject}`} />
    else return <div id="github">
      <Menu />
      <FtlLoader show={working} text="working" />
      <div className="ftl-section" style={{
        margin: 'auto',
        marginTop: 18,
        paddingRight: 30,
      }}>
        <StlButton style={{
            clear: 'both',
            float: 'right',
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
            marginBottom: 12,
            display: addingProjects && projects && projects.length && !branches ? 'inline-block' : 'none'
          }}
          semantic
          className="small"
          onClick={() => {
            this.setState({ addingProjects: false })
          }}>
          Done Adding
        </StlButton>
        <div className="white-block" style={{ clear: 'both', textAlign: 'center', padding: 18 }}>
          <div className="block-content">

            <this.RepoList />

          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
