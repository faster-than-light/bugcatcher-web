import React, { Component } from 'react'

// components
import Dashboard from './Dashboard'
import Landing from './Landing'
import Project from './Project'

export default class Home extends Component {
  render() {
    const { user } = this.props
    if (user && user.isSubscriber) return <Dashboard {...this.props} />
    else return <Landing {...this.props} />
  }
}
