import React, { Component } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Input } from 'semantic-ui-react'

// components
import FtlButton from './FtlButton'
import FtlModal from './FtlModal'

// helpers
import { getCookie } from '../helpers/cookies'

// images & styles
import '../assets/css/components/Modal.css'
import githubText from '../assets/images/github-inverted.png'
import githubLogo from '../assets/images/github-logo-inverted.png'

export default class GitHubActionModal extends Component {
  constructor () {
    super()
    this.state = {
      openModal: false,
      value: '',
      copied: {
        clear: false,
        encrypted: false,
      },
    }
  }

  render() {
    const {
      copied,
    } = this.state

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
    
    return <FtlModal
      title={`Setting Up the GitHub BugCatcher Action`}
      modalTrigger={<FtlButton className="github-button">
        Set Up the&nbsp;&nbsp;
        <img src={githubLogo} alt="GitHub Logo" />
        <img src={githubText} alt="GitHub Text" />
        &nbsp;Action
      </FtlButton>}
      size={'lg'}>
        <p>The <strong><a href="https://github.com/marketplace/actions/ftl-bugcatcher" target="_blank">BugCatcher GitHub Action</a></strong> allows you to add static analysis testing to your continuous integration workflows.</p>
        <p>In order to set up the Action, you will need to copy this token to your Repository Secrets as described in the <a href="https://github.com/faster-than-light/github-action/blob/master/README.md" target="_blank">Action instructions</a>.</p>
        <div style={{ margin: '9px 0' }}>
          Copy your <code>BUGCATCHER_TOKEN</code> :
          <CopyToClipboard text={getCookie("session")}
            onCopy={() => {
              this.refs.sid.select()
              this.setState({copied: {
                ...copied,
                clear: true
              }})
            }}>
              <Input ref="sid" placeholder={'Token'}
                name="name"
                icon={'key'}
                value={getCookie("session")}
                iconPosition={'left'}
                style={{
                  // marginLeft: -12,
                  fontSize: '18px',
                  width: '100%',
                }}
              />
          </CopyToClipboard>
          <div style={{color: 'red', padding: 12}}>
            {copied.clear ? `Copied to clipboard` : null}
          </div>
        </div>
        <p>After adding your <code>BUGCATCHER_TOKEN</code> token to your repository&apos;s Secrets, all you need to do is configure your repo to use the Action by adding it to your workflow <code>yaml</code> file.</p>
        <p>
          Example:<br />
          <div style={{
            backgroundColor: 'var(--color-light-grey)',
            padding: 12,
            fontSize: '81%',
            lineHeight: '1rem',
          }}>
            <code>name: BugCatcher<br />
            <br />
            on: [push]<br />
            <br />
            jobs:<br />
            &nbsp;&nbsp;CI:<br />
            &nbsp;&nbsp;runs-on: ubuntu-latest<br />
            &nbsp;&nbsp;steps:<br />
            &nbsp;&nbsp;&nbsp;- uses: actions/checkout@v1<br />
            &nbsp;&nbsp;&nbsp;- name: Use Node.js 12<br />
            &nbsp;&nbsp;&nbsp;&nbsp;uses: actions/setup-node@v1<br />
            &nbsp;&nbsp;&nbsp;&nbsp;with:<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;node-version: 12<br />
            &nbsp;&nbsp;&nbsp;- name: BugCatcher Static Analysis<br />
            &nbsp;&nbsp;&nbsp;&nbsp;uses: faster-than-light/github-action@master<br />
            &nbsp;&nbsp;&nbsp;&nbsp;with:<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;GITHUB_TOKEN: $&#123;&#123; secrets.GITHUB_TOKEN &#125;&#125;<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;BUGCATCHER_TOKEN: $&#123;&#123; secrets.BUGCATCHER_TOKEN &#125;&#125;<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SEVERITY_THRESHOLD: medium</code>  
          </div>
        </p>
    </FtlModal>
  }
}
