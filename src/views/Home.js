import React, { Component } from 'react'

// components
import Landing from '../views/Landing'
import Project from './Project'

export default class Home extends Component {
  render() {
    const { user } = this.props
    if (user && user.isSubscriber) return <Project {...this.props} />
    else return <Landing {...this.props} />
  }
}
