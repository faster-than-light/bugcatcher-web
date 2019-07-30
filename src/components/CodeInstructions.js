import React, { Component } from 'react'

export default class CodeInstructions extends Component {
  render() {
    if (this.props.codeOnServer) return null
    else {
      switch (this.props.productCode) {
        case "eth": {
          return <div style={this.props.style}>
            <p className="lead">Please upload your project with all its dependencies including any <i>package.json</i> or <i>ethpm.json</i> files.</p>
            <p className="lead">This allows the BugCatcher to analyze any contracts with dependencies.</p>
          </div>
        }
        default: {
          return <div style={this.props.style}>
            <p className="lead">Please upload your project with all its dependencies.</p>
          </div>
        }
      }
    }      
  }
}
