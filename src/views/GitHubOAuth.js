import React, { Component } from 'react'
import queryString from 'query-string'

// components
import Loader from '../components/Loader'

// helpers
import api from '../helpers/api'
import { appUrl } from '../config'

var isFetchingToken

class GitHubOAuth extends Component {
  /** @dev Constructor and Lifecycle *******************************/
  async componentDidMount() {
    const code = queryString.parse(document.location.search)['code']
    if (code && !isFetchingToken) {
      isFetchingToken = true
      const user = await this.fetchSidFromGithubCode(code)
      if (!user) {
        alert('There was a problem fetching a token. Please try again.')
      }  
      else {
        await this.props.setUser(user)
        document.location.href = '/'
      }
    }
  }


  /** @dev Network Data ******************************/
  fetchSidFromGithubCode = async code => {
    let sid
    try {
      sid = await api.getSidFromGithubToken({
        code,
        redirectUri: `${appUrl}/github/oauth`,
        state: 'login'
      })
    } catch(e) { console.error(e) }
    if (sid) return sid['data']
    else return
  }


  /** @dev Render a component ******************************/
  render() {
    return <Loader />
  }
}

export default React.memo(GitHubOAuth)
