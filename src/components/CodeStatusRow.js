import React, { Component } from 'react'
export default class CodeStatusRow extends Component {
  render() {
    return <div className={this.props.type} style={this.props.style}>{this.props.message}</div>
  }
}