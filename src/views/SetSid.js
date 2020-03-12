import React, { Component } from 'react'

// components
import { Redirect } from 'react-router-dom'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import { setCookie } from '../helpers/cookies'

export default class Home extends Component {
  static contextType = UserContext
  state = {}

  async componentWillMount() {
    const sid = this.props.match.params.sid
    setCookie("session", sid)
    await this.context.actions.fetchUser(true)
  }

  render() {
    return <Redirect to={'/cqc'} />
  }
}
