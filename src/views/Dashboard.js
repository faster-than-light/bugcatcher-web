import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard'
// import faker from 'faker'
import _ from 'lodash'
import { Accordion, Label, Message } from 'semantic-ui-react'

// components
import Menu from '../components/Menu'

// helpers
import config from '../config'
import { getCookie } from '../helpers/cookies'
import { encrypt } from '../helpers/crypto'
import { cleanProjectName } from '../helpers/strings'

// images & styles
import githubText from '../assets/images/github-inverted.png'
import githubLogo from '../assets/images/github-logo-inverted.png'
import StlButton from '../components/StlButton';


class LastProjectsAccessed extends Component {
  render() {
    let lastProjectsAccessed = getCookie("lastProjectsAccessed") || []
    if (lastProjectsAccessed.length) lastProjectsAccessed = JSON.parse(lastProjectsAccessed)
    let rtn = lastProjectsAccessed.map((p, k) => <div>
      <Link key={k} to={`/project/${p}`}>{p}</Link>
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
    copied: {
      clear: false,
      encrypted: false,
    },
    severityThreshold: 'low',
  }

  encryptConfigFile() {
    const cleanToken = `${getCookie("session")}|${this.state.repo}`
    const crypToken = encrypt(cleanToken, process.env.REACT_APP_PUBLIC_KEY)
    return `ENCRYPTED_SID=${crypToken}
SEVERITY_THRESHOLD=${this.state.severityThreshold}`
  }

  changeRepo() {
    const repo = this.repoToEncrypt ? this.repoToEncrypt.value : ''
    this.setState({ repo })
  }
  
  changeSeverity() {
    const severityThreshold = this.severityThreshold ? this.severityThreshold.value : ''
    this.setState({ severityThreshold })
  }

  setOpenPanel(openPanel) {
    console.log({openPanel})
    this.setState({ openPanel })
  }

  render() {
    const { addNewProject, copied, openPanel } = this.state
    const repo = this.repoToEncrypt ? this.repoToEncrypt.value : null
    const encryptedConfigFile = this.encryptConfigFile(repo)

    const panels = [
      // web app
      {
        key: `panel-1`,
        title: {
          content: <StlButton onClick={() => this.setOpenPanel(0)}>Run Tests using the Web App</StlButton>,
        },
        content: {
          content: (
            <Message
              info
              header={<h3>Run Tests using the Web App</h3>}
              content={<div>
                <p>You can use BugCatcher right here on the web! For best results, we recommend using Google&apos;s Chrome browser. By the way, closing your browser while tests are running won&apos;t affect your tests. The next time that you open BugCatcher, your tests will be either running or completed for you.</p>
                {/* <LastProjectsAccessed /> */}
                <Link to={'/github'}>
                  <StlButton className="github-button">
                    Test your&nbsp;
                    <img src={githubLogo} alt="GitHub Logo" />
                    <img src={githubText} alt="GitHub Text" />
                    &nbsp;repositories
                  </StlButton>
                </Link>&nbsp;
                <Link to={'/projects'}><StlButton>View All Your Projects</StlButton></Link>
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
              </div>}
            />
          ),
        },
      },
      // github app
      {
        key: `panel-2`,
        title: {
          content: <StlButton onClick={() => this.setOpenPanel(1)}>Install the GitHub BugCatcher CI App</StlButton>,
        },
        content: {
          content: (
            <Message
              info
              header={<h3>Install the GitHub BugCatcher CI App</h3>}
              content={<div>
                <ol>
                  <li>Install the GitHub <a href="#">BugCatcher CI App</a> on the repositories you want tested.</li>
                  <li>
                    Add a file named <code style={{ fontSize: '120%' }}>.bugcatcher</code> to each repository you are testing. <strong>Important:</strong> Each of your repositories needs its own encrypted <code>SID</code>. Please enter the repository &quot;full name&quot; here (ex: <code>faster-than-light/ftl</code>) and then copy the <code>.bugcatcher</code> config data to your repository.
                    <p><input ref={r => this.repoToEncrypt = r}
                      style={{ fontSize: 21 }}
                      onChange={this.changeRepo.bind(this)}
                      placeholder="<owner>/<repo>" />
                    &nbsp;Severity Threshold: <select ref={r => this.severityThreshold = r}
                      onChange={this.changeSeverity.bind(this)}>
                        <option>low</option>
                        <option>medium</option>
                        <option>high</option>
                    </select></p>
                  </li>
                </ol>
                <p>
                  <CopyToClipboard text={encryptedConfigFile}
                    onCopy={() => {
                      this.refs.sid.select()
                      this.setState({copied: {
                        ...copied,
                        encrypted: true
                      }})
                    }}>
                      <textarea type="text" ref="sid"
                        value={encryptedConfigFile}
                        style={{ width: '100%', height: 210 }} />
                  </CopyToClipboard>
                  <div style={{color: 'red', padding: 12}}>
                    {copied.encrypted ? `Copied to clipboard` : null}
                  </div>
                </p>
              </div>}
            />
          ),
        },
      },
      // cli tool
      {
        key: `panel-3`,
        title: {
          content: <StlButton onClick={() => this.setOpenPanel(2)}>Run Tests using the CLI Tool</StlButton>,
        },
        content: {
          content: (
            <Message
              info
              header={<h3>Run Tests using the CLI Tool</h3>}
              content={<div>
                <p>We have a CLI tool you can use to test your code with BugCatcher. Simply follow the instructions found in the <a href="https://github.com/faster-than-light/ftl/blob/master/README.md" target="_blank">README.md file on GitHub</a>.</p>
                <p>This is your <code style={{ fontSize: '120%' }}>SID</code> to be used with the <a href="https://github.com/faster-than-light/ftl" target="_blank">CLI Tool</a></p>
                <p>
                  <CopyToClipboard text={getCookie("session")}
                    onCopy={() => {
                      this.refs.sid.select()
                      this.setState({copied: {
                        ...copied,
                        clear: true
                      }})
                    }}>
                      <input type="text" ref="sid"
                        value={getCookie("session")}
                        style={{ width: '100%' }} />
                  </CopyToClipboard>
                  <div style={{color: 'red', padding: 12}}>
                    {copied.clear ? `Copied to clipboard` : null}
                  </div>
                </p>
              </div>}
            />
          ),
        },
      }
    ]
  
    const AccordionExampleShorthand = () => <Accordion panels={panels}
      defaultActiveIndex={openPanel} />
    
    // remove "copied" label after short delay
    let removeCopiedLabel = {}
    if (copied['clear'] && !removeCopiedLabel['clear']) {
      removeCopiedLabel['clear'] = setTimeout(
        () => {
          removeCopiedLabel['clear'] = null
          this.setState({ copied: {
            ...this.state.copied,
            clear: false
          } })
        },
        3000
      )
    }
    if (copied['encrypted'] && !removeCopiedLabel['encrypted']) {
      removeCopiedLabel['encrypted'] = setTimeout(
        () => {
          removeCopiedLabel['encrypted'] = null
          this.setState({ copied: {
            ...this.state.copied,
            encrypted: false
          } })
        },
        3000
      )
    }
    
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
        
        <div className={'white-block'} style={{ padding: 18 }}>
          <h2>Ways to Use BugCatcher:</h2>
          <AccordionExampleShorthand />
        </div>

        <br />
      </div>
    </div>
  }
}
