import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'

class htmlButton extends Component {
  render() {
    return <button {...this.props} />
  }
}

export default class FtlButton extends Component {
  render() {
    let { className, disabled, grey, style, semantic } = this.props
    const B = semantic ? Button : htmlButton
    semantic = Boolean(semantic).toString()
    if (grey) className = ('grey ' + className).trim()
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
