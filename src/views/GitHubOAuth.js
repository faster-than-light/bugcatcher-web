import React, { Component } from 'react'
import queryString from 'query-string'

// components
import Loader from '../components/Loader'

// helpers
import api from '../helpers/api'
import { appUrl, github } from '../config'
import { setCookie } from '../helpers/cookies'

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
    try {
      const { data } = await api.getSidFromGithubToken({
        code,
        redirectUri: `${appUrl}/github/oauth`,
        state: 'login'
      })
      if (data) {
        setCookie(github.tokenCookieName, data['github_token'])
        return data
      }
      else return
    } catch(e) { console.error(e); return }
  }


  /** @dev Render a component ******************************/
  render() {
    return <Loader />
  }
}

export default React.memo(GitHubOAuth)
