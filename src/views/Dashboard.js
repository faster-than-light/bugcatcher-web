import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard'
// import faker from 'faker'
import _ from 'lodash'
import {
  Accordion,
  Divider,
  Dropdown,
  Form,
  Input,
  Label,
  Message
} from 'semantic-ui-react'

// components
import Menu from '../components/Menu'
import FtlButton from '../components/FtlButton'

// helpers
import config from '../config'
import { getCookie } from '../helpers/cookies'
import { encrypt } from '../helpers/crypto'
import { cleanProjectName } from '../helpers/strings'

// images & styles
import githubText from '../assets/images/github-inverted.png'
import githubLogo from '../assets/images/github-logo-inverted.png'

export default class Dashboard extends Component {
  state = {
    value: '',
    copied: {
      clear: false,
      encrypted: false,
      // severityThreshold: 'medium',
    },
  }

  encryptConfigFile(repo, severity) {
    const cleanToken = `${getCookie("session")}|${repo}`
    const crypToken = encrypt(cleanToken, process.env.REACT_APP_PUBLIC_KEY)
    return `ENCRYPTED_SID=${crypToken}
SEVERITY_THRESHOLD=${severity}`
  }

  checkRepo() {
    
    const repo = this.repoToEncrypt.inputRef.value
    const hasOneSlash =  Boolean(repo.split('/').length === 2)
    const hasOwner =  Boolean(
      repo.split('/')[0] &&
      repo.split('/')[0].length
    )
    const hasRepoName =  Boolean(
      repo.split('/')[1] &&
      repo.split('/')[1].length
    )
    if (hasOneSlash && hasOwner && hasRepoName) {
      this.setState({ foundRepo: repo })
    }

  }
  
  checkSeverity(e) {
    let severityThreshold = this.severityThreshold ? this.severityThreshold.state.value : ''
    if (e) severityThreshold = e.target.textContent
    if (severityThreshold) {
      this.setState({ severityThreshold })
      return severityThreshold
    }
    else return false
  }

  encryptToken() {
    const severityThreshold = this.checkSeverity()
    if (!this.state.foundRepo) {
      alert('Please specify a repository')
      return false
    }
    else if (!severityThreshold) {
      alert('Please choose a severity threshold')
      return false
    }
    else {
      const encryptedConfigFile = this.encryptConfigFile(this.state.foundRepo,severityThreshold)
      this.setState({ encryptedConfigFile })
    }
  }

  setOpenPanel(openPanel) {
    this.setState({ openPanel })
  }

  EncryptTokenForm = () => {
    const { findingRepo, foundRepo, severityThreshold } = this.state
    return <Form id="encrypt_token" key="encrypt_token">
      <Divider />
      <Form.Field>
        <h4>Repository Name <span style={{
          fontSize: 13,
          marginLeft: 9,
          color: '#666',
          fontStyle: 'italic',
          fontWeight: 'normal',
        }}>(ex: faster-than-light/ftl)</span></h4>
        <Input ref={r => this.repoToEncrypt = r}
          value={foundRepo}
          key="repoToEncrypt"
          id="repoToEncrypt"
          name="repoToEncrypt"
          loading={Boolean(findingRepo)}
          icon={foundRepo && foundRepo.length ? 'check' : null} 
          onChange={() => {}}
          onBlur={this.checkRepo.bind(this)}
          placeholder="<owner>/<repo>" />
      </Form.Field>
      <Divider />
      <Form.Field>
        <h4>Severity Threshold</h4>
        <Dropdown ref={r => this.severityThreshold = r}
          key="severity"
          id="severity"
          name="severity"
          onChange={this.checkSeverity.bind(this)}
          value={severityThreshold}
          fluid selection options={
          [
            {
              key: 'high',
              text: 'high',
              value: 'high',
            },
            {
              key: 'medium',
              text: 'medium',
              value: 'medium',
            },
            {
              key: 'low',
              text: 'low',
              value: 'low',
            },
          ]
        } placeholder="Select the minimum severity level for triggering a failure" />
      </Form.Field>
      <Divider />
      <Form.Field>
        <FtlButton onClick={this.encryptToken.bind(this)}>Generate Encrypted Config File</FtlButton>
      </Form.Field>
    </Form>

  }

  render() {
    const {
      addNewProject,
      copied,
      encryptedConfigFile,
      openPanel,
    } = this.state

    const panels = [
      // web app
      {
        key: `panel-1`,
        title: {
          content: <FtlButton grey onClick={() => this.setOpenPanel(0)}>Run Tests using this Web App</FtlButton>,
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
                  <FtlButton className="github-button">
                    Test your&nbsp;
                    <img src={githubLogo} alt="GitHub Logo" />
                    <img src={githubText} alt="GitHub Text" />
                    &nbsp;repositories
                  </FtlButton>
                </Link>&nbsp;
                <Link to={'/projects'}><FtlButton>View All Your Projects</FtlButton></Link>
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
          content: <FtlButton grey onClick={() => this.setOpenPanel(1)}>Install the BugCatcher GitHub App</FtlButton>,
        },
        content: {
          content: (
            <Message
              info
              header={<h3>Install the BugCatcher GitHub App</h3>}
              content={<div>
                <ol>
                  <li>Install the <a href="https://github.com/apps/ftl-bugcatcher" target="_blank">FTL BugCatcher</a> GitHub App on the repositories you want tested.</li>
                  <li>
                    Add a file named <code style={{ fontSize: '120%' }}>.bugcatcher</code> to each repository you are testing. <strong>Important:</strong> Each of your repositories needs its own encrypted <code>SID</code>. Please enter the repository &quot;full name&quot; here (ex: <code>faster-than-light/ftl</code>) and then copy the <code>.bugcatcher</code> config data to your repository.
                    <div style={{ margin: '9px 0' }}>
                      <this.EncryptTokenForm key="token_form" />
                    </div>
                  </li>
                </ol>
                <div style={{ display: Boolean(encryptedConfigFile) ? 'block' : 'none', margin: '9px 0', marginLeft: '9%' }}>
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
                        onChange={() => {}}
                        style={{ width: '100%', height: 210 }} />
                  </CopyToClipboard>
                  <div style={{color: 'red', padding: 12}}>
                    {copied.encrypted ? `Copied to clipboard` : null}
                  </div>
                </div>
              </div>}
            />
          ),
        },
      },
      // cli tool
      {
        key: `panel-3`,
        title: {
          content: <FtlButton grey onClick={() => this.setOpenPanel(2)}>Run Tests using the CLI Tool</FtlButton>,
        },
        content: {
          content: (
            <Message
              info
              header={<h3>Run Tests using the CLI Tool</h3>}
              content={<div>
                <p>We have a CLI tool you can use to test your code with BugCatcher. Simply follow the instructions found in the <a href="https://github.com/faster-than-light/ftl/blob/master/README.md" target="_blank">README.md file on GitHub</a>.</p>
                <p>This is your <code style={{ fontSize: '120%' }}>SID</code> to be used with the <a href="https://github.com/faster-than-light/ftl" target="_blank">CLI Tool</a></p>
                <div style={{ margin: '9px 0' }}>
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
                        onChange={() => {}}
                        style={{ width: '100%' }} />
                  </CopyToClipboard>
                  <div style={{color: 'red', padding: 12}}>
                    {copied.clear ? `Copied to clipboard` : null}
                  </div>
                </div>
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
          <h2>How to Use BugCatcher:</h2>
          <AccordionExampleShorthand />
          {/* <Link to={'/github'}>
            <FtlButton className="github-button">
              Test your&nbsp;
              <img src={githubLogo} alt="GitHub Logo" />
              <img src={githubText} alt="GitHub Text" />
              &nbsp;repositories
            </FtlButton>
          </Link> */}
        </div>

        <br />
      </div>
    </div>
  }
}
