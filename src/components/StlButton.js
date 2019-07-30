import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'

class htmlButton extends Component {
  render() {
    return <button {...this.props} />
  }
}

export default class StlButton extends Component {
  render() {
    let { className, disabled, style, semantic } = this.props
    const B = semantic ? Button : htmlButton
    semantic = Boolean(semantic).toString()
    return <B {...this.props}
      semantic={semantic}
      className={
        (className ? className + ' btn' : 'btn') +
        (disabled ? ' disabled' : '')
      }
      style={{ ...style, opacity: disabled ? '0.33' : '1' }}
       />
  }
}
