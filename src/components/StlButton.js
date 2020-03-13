import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'

class htmlButton extends Component {
  render() {
    return <button {...this.props} />
  }
}

export default class StlButton extends Component {
  render() {
    let { className, grey, disabled, link: linkClassName, style, semantic } = this.props
    const newProps = {
      ...this.props,
      link: undefined
    }
    const B = semantic ? Button : htmlButton
    semantic = Boolean(semantic).toString()
    return <B {...newProps}
      semantic={semantic}
      className={
        (className ? className + ' btn' : 'btn') +
        (disabled ? ' disabled' : '') +
        (grey ? ' grey' : '') +
        (linkClassName ? ' link' : '')
      }
      style={{ ...style, opacity: disabled ? '0.33' : '1' }}
       />
  }
}
