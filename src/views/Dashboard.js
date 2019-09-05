import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard'

// components
import Menu from '../components/Menu'

// helpers
import config from '../config'
import { getCookie } from '../helpers/cookies'

// styles
import '../assets/css/Dashboard.css'
import StlButton from '../components/StlButton';

class LastProjectsAccessed extends Component {
  render() {
    let lastProjectsAccessed = getCookie("lastProjectsAccessed") || []
    if (lastProjectsAccessed.length) lastProjectsAccessed = JSON.parse(lastProjectsAccessed)
    return lastProjectsAccessed.map(p => <div>
      <Link to={`/project/${p}`}>{p}</Link>
    </div>)
  }
}
export default class Dashboard extends Component {
  state = {
    value: '',
    copied: false,
  }
  
  render() {
    const { copied } = this.state

    // remove "copied" label after short delay
    let removeCopiedLabel
    if (copied && !removeCopiedLabel) removeCopiedLabel = setTimeout(
      () => {
        removeCopiedLabel = null
        this.setState({ copied: false })
      },
      3000
    )
    
    if (!this.props.user) return <Redirect to={'/'} />
    else return <div id="dashboard">
      <Menu />
      <h3 className="contents" style={{ textAlign: 'center', margin: '36px auto' }}>Feedback or bug reports about the BugCatcher beta? Email <a href={`mailto:${config.helpEmail}`}>{config.helpEmail}</a></h3>
      <div style={{
        maxWidth: 720,
        margin: 'auto',
      }}>
        <h1>Welcome to BugCatcher!</h1>
        <div className="rounded-block">
          <h3>Run Tests using the Web App</h3>
          <LastProjectsAccessed /><br />
          <Link to={'/projects'}><StlButton semantic className="btn small default">View All Projects</StlButton></Link>
        </div>
        <div className="rounded-block">
          <h3>Run Tests using the CLI Tool</h3>
          <p>This is your <code style={{ fontSize: '120%' }}>SID</code> to be used with the <a href="#" onClick={() => {alert('coming soon')}}>CLI Tool</a></p>
          <p>
            <CopyToClipboard text={getCookie("session")}
              onCopy={() => {
                this.refs.sid.select()
                this.setState({copied: true})
              }}>
                <input type="text" ref="sid"
                  value={getCookie("session")}
                  style={{ width: '100%' }} />
            </CopyToClipboard>
            {copied ? <span style={{color: 'red'}}>&nbsp;Copied to clipboard.</span> : null}
          </p>
        </div>

        <br />
      </div>
    </div>
  }
}
