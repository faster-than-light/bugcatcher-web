import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'
import { Form, TextArea } from 'semantic-ui-react'
import { Loader } from 'semantic-ui-react'
import queryString from 'query-string'

// components
import Menu from '../components/Menu'
import FtlLoader from '../components/Loader'
// import ProjectList from '../components/ProjectList'
// import ThemeLogo from '../components/ThemeLogo'
import StlButton from '../components/StlButton'

// context
// import { UserContext } from '../contexts/UserContext'

// helpers
import { getCookie, setCookie } from '../helpers/cookies'
// import api from '../helpers/api'
import { appUrl, github as configGitHub } from '../config'
// import { cleanProjectName } from '../helpers/strings'
import githubApi from '../helpers/githubApi'

// images & styles
// import githubText from '../assets/images/github-inverted.png'
// import githubLogo from '../assets/images/github-logo-inverted.png'

export default class CQC extends Component {
  state = {}

  componentWillMount() {
    this.setState({ working: true })

    let token = getCookie(configGitHub.tokenCookieName)
    token = token.length ? token : null
    if (token) this.setState({ token })
    this.checkCredentials()
    this.checkToken()
  }

  checkCredentials() {
    setTimeout(() => {
      let token = getCookie(configGitHub.tokenCookieName)
      token = token.length ? token : null

      const redirect = this.props.user ? null : '/'

      this.setState = {
        redirect,
        token,
      }
    }, 300)
  }

  async checkToken() {
    const code = queryString.parse(document.location.search)['code']
    const { user } = this.props
    let { token } = this.state
    if (code && !token) token = await this.fetchToken(code)
    if (token) await githubApi.setToken(token)
    this.setState({
      code: !user && code ? code : null,
      working: false,
    })
  }

  async fetchToken(code) {
    let token
    try {
      token = await githubApi.getAccessToken(code)
    } catch(e) { console.error(e) }
    if (token) {
      setCookie(configGitHub.tokenCookieName, token)
      this.setState({ token })
    }
    return token
  }

  RepoList = () => {
    return <React.Fragment>
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
  }

  LoadingRepos = () => {
    return this.state.token && !this.state.working ?
      <Loader active inline='centered' size='large' /> : <this.RepoList />
  }

  render() {
    const {
      redirect,
      token,
      working = false,
    } = this.state

    if (redirect) return <Redirect to={redirect} />
    else return <div className={`theme`}>
      <Menu />
      <FtlLoader show={working} text="working" />

      <section id="cqc" className="contents">
      {
        !token ? <React.Fragment>
          <p>
            <a href={`https://github.com/login/oauth/authorize?client_id=${configGitHub.clientId}&type=user_agent&scope=user,repo&redirect_uri=${appUrl}/gh_auth?cqc=1`}>
              <StlButton className="big"
              onClick={
                () => { this.setState({ working: true }) }
              }>Connect BugCatcher to GitHub</StlButton>
            </a>
          </p>
        </React.Fragment> : `form goes here`

      }

      </section>
    </div>
  }
}

