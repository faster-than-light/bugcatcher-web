import React, { Component } from 'react'

// helpers
import { github, usePaywall } from '../config'
import { getCookie, setCookie } from '../helpers/cookies'
import api from '../helpers/api'
import LocalStorage from '../helpers/LocalStorage';
import { isSubscriber } from '../helpers/data'
import CqcApi from '../helpers/cqcApi';

const cqcApi = CqcApi(getCookie('session'))

// context
export const UserContext = React.createContext()

// provider
export class UserProvider extends Component {
  state = {}

  async componentWillMount() {
    const user = await this.actions.fetchUser()
    if (
      !user ||
      (
        user &&
        (
          user.error ||
          (user.message && user.message.toLowerCase().match('error'))
        )
      )
    ) this.actions.setUser(null)
    else {
      this.actions.setUser(user)
      // window.mixpanel.identify(user.email)
      // window.mixpanel.people.set(
      //   {
      //     "$email": user.email,
      //     "$name": user.name,
      //     version,
      //   }
      // )
    }
  }

  setUser = user => {
    user = extendUser(user)
    LocalStorage.User.setUser(user)
    this.setState({ user })
    if (user && typeof user === 'object') {
      setCookie('session', user.sid)
      api.setSid(user.sid)
    }
    else {
      setCookie('session', null, -1)
      setCookie('tokenId', null, -1)
      setCookie(github.tokenCookieName, null, -1)
      api.setSid(null)
    }
  }

  actions = {
    fetchUser: async (clearStorage) => {
      this.setState({ userDataLoaded: false })
      const session = getCookie('session')
      const tokenId = getCookie('tokenId')
      const jwtExpires = getCookie('jwtExpires')
      const envSid = process.env.REACT_APP_STL_INTERNAL_SID
      // if (session && !jwtExpires || (
      //   new Date() > new Date(jwtExpires)
      // )) {
      //   const { accessToken, expires: accessTokenExpires } = await cqcApi.getToken(session)
      //   setCookie('jwtExpires', accessTokenExpires)
      // }
    
      
      let user
      if (clearStorage) LocalStorage.User.setUser()
      else user = LocalStorage.User.getUser()
      
      if (
        user && 
        (
          (session && user.sid === session) ||
          (envSid && user.sid === envSid)
        )
      ) {
        this.setState({ userDataLoaded: true })
        this.actions.setUser(user)
        return extendUser(user)
      }
      else {
        /** @dev Fetch user data from backend */

        // no sid?, use a token
        if (!envSid && !session && tokenId) {
          const { data: getSid } = await api.getSid({token: tokenId})
          if (getSid) user = {
            ...user,
            sid: getSid.sid,
          }
        }

        // fetch full user data object
        if (envSid || session || (user && user.sid)) {
          const { data: getUserData } = await api.getUserData({sid: envSid || session || user.sid})
          if (getUserData) user = {
            ...getUserData,
            sid: envSid || session || user.sid,
          }
        }
        else user = null

        // store user object to local storage
        this.actions.setUser(user)
        this.setState({ userDataLoaded: true })
        return extendUser(user)
      }
    },
    setUser: this.setUser,
    logOut: async () => {
      this.setUser(null)
      await cqcApi.removeJwt()
      // setTimeout(
      //   () => {
          window.location.href = '/'
          // window.location.reload()
      //   },
      //   333
      // )
    }
  }

  render() {
    return (
      <UserContext.Provider value={{
        state: this.state,
        actions: this.actions,
      }}>
        {this.props.children}
      </UserContext.Provider>
    )
  }
}

const extendUser = user => user ? ({
  ...user,
  isSubscriber: usePaywall ? isSubscriber(user) : true,
}) : null
