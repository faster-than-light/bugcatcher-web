import React, { Component } from 'react'
import queryString from 'query-string'

// components
import Loader from '../components/Loader'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import CqcApi from '../helpers/cqcApi'
import { appUrl, github } from '../config'
import { getCookie, setCookie } from '../helpers/cookies'

const cqcApi = CqcApi(getCookie("session"))

var isFetchingToken

class GitHubOAuth extends Component {
  static contextType = UserContext

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

        /** Get a jwt from the proxy server */
        await cqcApi.getJwt( user['sid'] )
      }
      document.location.href = '/'
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

export default GitHubOAuth
