import React, { Component } from 'react'

// components
// import Dashboard from './Dashboard'
import Repositories from './GitHub/Repositories'
import Landing from './Landing'

export default class Home extends Component {
  render() {
    const { user } = this.props
    if (user) return <Repositories {...this.props} />
    else return <Landing {...this.props} />
  }
}
