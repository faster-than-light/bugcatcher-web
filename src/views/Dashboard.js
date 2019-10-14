import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard'

// components
import Menu from '../components/Menu'

// helpers
import config from '../config'
import { getCookie } from '../helpers/cookies'
import { cleanProjectName } from '../helpers/strings'

// images & styles
import githubText from '../assets/images/github.png'
import githubLogo from '../assets/images/github-logo.png'
import StlButton from '../components/StlButton';

class LastProjectsAccessed extends Component {
  render() {
    let lastProjectsAccessed = getCookie("lastProjectsAccessed") || []
    if (lastProjectsAccessed.length) lastProjectsAccessed = JSON.parse(lastProjectsAccessed)
    let rtn = lastProjectsAccessed.map(p => <div>
      <Link to={`/project/${p}`}>{p}</Link>
    </div>)
    if (lastProjectsAccessed.length) rtn = <span>
      {rtn}<br />
    </span>
    return rtn
  }
}
export default class Dashboard extends Component {
  state = {
    value: '',
    copied: false,
  }
  
  render() {
    const { addNewProject, copied } = this.state

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
    else if (addNewProject) return <Redirect to={`/project/${addNewProject}`} />
    else return <div id="dashboard">
      <Menu />
      <div style={{
        maxWidth: 720,
        margin: 'auto',
      }}>
        <div className="white-block" style={{ textAlign: 'center', marginTop: 111, padding: 18 }}>
          <h1 className="secondary-color">Welcome to BugCatcher!</h1>
          <strong>Feedback or bug reports about the BugCatcher beta? Email <a href={`mailto:${config.helpEmail}`}>{config.helpEmail}</a></strong>
        </div>
        <div className="white-block">
          <h3>Run Tests using the Web App</h3>
          <div className="block-content">
            <p>You can use BugCatcher right here on the web! For best results, we recommend using Google&apos;s Chrome browser. By the way, closing your browser while tests are running won&apos;t affect your tests. The next time that you open BugCatcher, your tests will be either running or completed for you.</p>
            <LastProjectsAccessed />
            <Link to={'/projects'}><StlButton semantic className="btn default">View All Your Projects</StlButton></Link>
            <Link to={'/github'}>
              <StlButton semantic className="github-button">
                Test your&nbsp;
                <img src={githubLogo} alt="GitHub Logo" />
                <img src={githubText} alt="GitHub Text" />
                &nbsp;repositories
              </StlButton>
            </Link>
            <button className={'link'}
            onClick={() => {
              let projectName = prompt('What is the name of your project?')
              projectName = cleanProjectName(projectName)
              if (projectName.length) this.setState({
                addNewProject: encodeURIComponent(
                  projectName.trim().replace(/\s\s+/g, ' ')
                )
              })
            }}>add a project</button>
          </div>
        </div>
        <div className="white-block">
          <h3>Run Tests using the CLI Tool</h3>
          <div className="block-content">
            <p>We have a CLI tool you can use to test your code with BugCatcher. Simply follow the instructions found in the <a href="https://github.com/faster-than-light/ftl/blob/master/README.md" target="_blank">README.md file on GitHub</a>.</p>
            <p>This is your <code style={{ fontSize: '120%' }}>SID</code> to be used with the <a href="https://github.com/faster-than-light/ftl" target="_blank">CLI Tool</a></p>
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
              <div style={{color: 'red', padding: 12}}>
                {copied ? `Copied to clipboard` : null}
              </div>
            </p>
          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
