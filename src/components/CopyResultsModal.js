import React, { Component } from 'react'
import { Modal } from 'semantic-ui-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

// components
import ResultsMarkdownRow from './ResultsMarkdownRow'
import StlButton from './StlButton'

// helpers
import { appUrl } from '../config'

// styles & images
import '../assets/css/components/Modal.css'

export default class DownloadResultsModal extends Component {
  constructor () {
    super()
    this.state = {
      openModal: false,
      productCode: 'python',
      value: '',
      copied: false,
    }
  }

  componentWillMount() {
    if (this.props.productCode) this.setState({
      productCode: this.props.productCode
    })
  }
  
  render() {
    const { copied, openModal, productCode } = this.state
    const { format, markdownPayload, ghTreeSha } = this.props
    const { groupedResults, languagesUsed, project, results, testId, testToolsUsed } = markdownPayload
    const badgeUrl = `${appUrl}/img/bugcatcher-approved.png`
    const badge = `<img src="${badgeUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" />`
    const badgeAndText = `### Passing All Tests!\n${badge}`
    const approvedBadgeUrl = `${appUrl}/img/bugcatcher-approved.png`
    const logoUrl = `${appUrl}/img/ftl-bugcatcher.png`
    const treeSha = ghTreeSha ? `\n**GitHub Tree SHA**: \`${ghTreeSha}\`` : ''

    const markdown = (() => {
      return `<img src="${logoUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" />

# BugCatcher Test Results\n

**Project Name**: \`${project}\`

**Test ID**: \`${testId}\`
${treeSha}

#### Languages found: 
${languagesUsed.map(l => `\`${l}\``).join(' ')}

#### Testing Tools Used: 
${testToolsUsed.map(t => `\`${t}\``).join(' ')}

#### Files Tested: 
\`\`\`
${results.test_run.codes.map(c => c.name).join('\n')}
\`\`\`

## RESULTS:
${!groupedResults.length ? badgeAndText : groupedResults.map(r => `- ${ResultsMarkdownRow(r)}`).join('\n')}
##

<img src="${approvedBadgeUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" />
`
    })()

    // remove "copied" label after short delay
    let removeCopiedLabel
    if (copied && !removeCopiedLabel) removeCopiedLabel = setTimeout(
      () => {
        removeCopiedLabel = null
        this.setState({ copied: false })
      },
      3000
    )

    return <React.Fragment>
      <StlButton onClick={()=>this.setState({openModal:true})} semantic>{format}</StlButton>
      <Modal
        closeIcon
        onClose={() => this.setState({openModal:false})}
        open={openModal}
        style={{
          backgroundColor: 'Black',
          width: '81%',
          height: '81%',
          maxWidth: 600,
          color: 'White',
          margin: 'auto',
          marginTop: '9%'
        }}
      >
        <div className={`copy-results theme-modal ${productCode}-theme`}>
          <h2 className="primary-color">Copy Your Test Results as {format}</h2>
          <CopyToClipboard text={markdown}
              onCopy={() => {
                this.refs.markdown.select()
                this.setState({copied: true})
              }}>
                <textarea ref="markdown" style={{
                  width: '100%',
                  height: '72%',
                }}>{markdown}</textarea>
          </CopyToClipboard>
          <div style={{ height: 15 }} />
          <StlButton className={'link close-markdown-modal'}
            onClick={() => this.setState({openModal:false})}
            style={{ float: 'right' }}>
            close
          </StlButton>
          <CopyToClipboard text={markdown}
              onCopy={() => this.setState({copied: true})}>
            <StlButton semantic>
              {`Copy ${format} Results`}
            </StlButton>
          </CopyToClipboard>
          {copied ? <span style={{color: 'red'}}>&nbsp;Copied to clipboard.</span> : null}

        </div>
      </Modal> 
    </React.Fragment>
  }
}
