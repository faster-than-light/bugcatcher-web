import React, { Component } from 'react'

// components
import Dashboard from './Dashboard'
import Landing from './Landing'

export default class Home extends Component {
  render() {
    const { user } = this.props
    if (user) return <Dashboard {...this.props} />
    else return <Landing {...this.props} />
  }
}
