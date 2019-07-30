import React, { Component } from 'react'
import bugCatcherLogo from '../assets/images/bugcatcher.png'
import ethBugCatcherLogo from '../assets/images/bugcatcher-eth.png'
import pythonBugCatcherLogo from '../assets/images/bugcatcher-python.png'

const logos = {
  default: bugCatcherLogo,
  eth: ethBugCatcherLogo,
  java: bugCatcherLogo,
  python: pythonBugCatcherLogo,
}

export default class ThemeLogo extends Component {
  render() {
    return <img
      alt="BugCatcher"
      style={this.props.style}
      src={bugCatcherLogo} />
  }
}
