import React, { Component } from 'react'

// helpers
// import { getCookie, setCookie } from '../helpers/cookies'

// context
export const AuditContext = React.createContext()

export class AuditProvider extends Component {
  state = {
    auditResults: [],
  }
  actions = {
    setAuditResults: auditResults => {
      this.setState({ auditResults })
    },
    saveAuditResult: result => {
      console.log('saveAuditResult', result)
      let recordedResult = this.state.auditResults.find(
        r => r.stlId === result.stlId
      )
      recordedResult = recordedResult || { stlId: result.stlId }
      console.log({ recordedResult })
      this.setState({
        auditResults: this.state.auditResults.filter(
          r => r.stlId !== result.stlId
        ).concat(recordedResult)
      })
    },
  }

  render() {
    return (
      <AuditContext.Provider value={{
        state: this.state,
        actions: this.actions,
      }}>
        {this.props.children}
      </AuditContext.Provider>
    )
  }
}

