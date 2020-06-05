import React, { Component } from 'react'
import { Button } from 'semantic-ui-react'

class htmlButton extends Component {
  render() {
    return <button {...this.props} />
  }
}

export default class FtlButton extends Component {
  render() {
    let {
      big,
      className,
      disabled,
      grey,
      style,
      semantic,
      small,
      tiny,
    } = this.props
    const B = semantic ? Button : htmlButton
    semantic = Boolean(semantic).toString()
    if (big) className = ('big ' + className).trim()
    if (grey) className = ('grey ' + className).trim()
    if (small) className = ('small ' + className).trim()
    if (tiny) className = ('tiny ' + className).trim()
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
