import React, { Component } from 'react'
import { Dimmer, Loader } from 'semantic-ui-react'

export default class Loading extends Component {
  render() {
    if (this.props.show !== false) return <Dimmer active inverted style={{ height: document.body.clientHeight }}>
      <Loader inverted>{this.props.text || 'Loading'}</Loader>
    </Dimmer>
    else return null
  }
}