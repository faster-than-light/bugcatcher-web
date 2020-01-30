import React, { Component } from 'react'
import { Modal } from 'semantic-ui-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import moment from 'moment'

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
    const badgeUrl = `${appUrl}/img/badge.png`
    const badge = `<img src="${badgeUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" />`
    const badgeAndText = `### Passing All Tests!\n${badge}`
    const approvedBadgeUrl = `${appUrl}/img/badge.png`
    const logoUrl = `${appUrl}/img/logo.png`
    const treeSha = ghTreeSha ? `\n**GitHub Tree SHA**: \`${ghTreeSha}\`` : ''
    const startTime = moment(results.test_run.start)
    const endTime = moment(results.test_run.end)
    const duration = moment.duration(endTime.diff(startTime))
    const hours = duration.hours()
    const minutes = duration.minutes()
    const seconds = duration.seconds()
    let elapsed = `${seconds} seconds`
    if (minutes) elapsed = `${minutes} minutes, ` + elapsed
    if (hours) elapsed = `${hours} hours, ` + elapsed

    const markdown = (() => {
      return `<img src="${logoUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" />

# Code Quality Certification\n

**Project Name**: \`${project}\`

**Test ID**: \`${testId}\`
${treeSha}

#### Languages found: 
${languagesUsed.map(l => `\`${l}\``).join(' ')}

#### Testing Tools Used: 
${testToolsUsed.map(t => `\`${t}\``).join(' ')}

#### Files Tested: 
\`${results.test_run.total_files}\` files tested

#### Test Duration:
Testing started: \`${startTime}\`<br />
Testing ended: \`${endTime}\`<br />
Test elapsed: \`${elapsed}\`

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
