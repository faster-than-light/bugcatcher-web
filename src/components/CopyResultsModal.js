import React, { Component } from 'react'
import { Modal } from 'semantic-ui-react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

// components
import ResultsMarkdownRow from './ResultsMarkdownRow'
import StlButton from './StlButton'

// helpers
import api from '../helpers/api'
import { appUrl } from '../config'
import { durationBreakdown } from '../helpers/moment'
import cqcApi from '../helpers/cqcApi'

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

  publishResults = async () => {
    this.setState({copied: true})    

    const { markdownPayload, user } = this.props
    let { results } = markdownPayload

    // append user object to results
    results.user = user

    // push results to cqc server
    const putResults = await cqcApi.putResults(results).catch(() => null)
    
    // push PDF data to cqc server
    const putPDF = await this.putPDF(results.test_run.stlid).catch(() => null)

    if (!putResults || !putPDF) console.error(
      new Error('error pushing results to proxy server')
    )
  }
  
  fetchPDF = (stlid) => {
    return new Promise((resolve, reject) => {

      const fail = () => {
        console.error(new Error("Error fetching results PDF"))
        reject()
      }
      api.getTestResult({
        stlid,
        format: 'pdf',
        options: {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/pdf'
          },
          responseType: "blob"
        }
      })
      .then(response => {
        if (response && response.data && response.data.size > 5) {
          const blob = new Blob([response.data], { type: 'application/pdf' })
          const reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onloadend = () => {
            resolve(reader.result)               
          }
        }
        else fail()
      })
      .catch(fail)

    })
  }

  putPDF = async (stlid) => {
    const blob = await this.fetchPDF(stlid).catch(() => null)
    if (!blob) return
    const data = {
      blob,
      stlid,
      user: this.props.user
    }
    return cqcApi.putPDF(data).catch(() => null)
  }
  
  render() {
    const { copied, openModal, productCode } = this.state
    const { certified, disabled, format, ghTreeSha, markdownPayload } = this.props
    const { groupedResults, languagesUsed, project, results, testId, testToolsUsed } = markdownPayload
    const approvedBadgeUrl = `${appUrl}/img/badge.png`
    const badge = `<a href="${appUrl + '/results/' + testId}?published=1" target="_blank"><img src="${approvedBadgeUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" /></a>`
    const badgeAndText = `### Passing All Tests!\n${badge}`
    const logoUrl = `${appUrl}/img/logo.png`
    const treeSha = ghTreeSha && ghTreeSha != 'undefined' ? `\n**GitHub Tree SHA**: \`${ghTreeSha}\`` : ''
    const elapsed = durationBreakdown(results.test_run.start, results.test_run.end)

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
\`${results.test_run.codes.length}\` files tested

#### Test Duration:
Testing started: \`${results.test_run.start}\`<br />
Testing ended: \`${results.test_run.end}\`<br />
Test elapsed: \`${elapsed}\`

## RESULTS:
${!groupedResults.length ? badgeAndText : groupedResults.map(r => `- ${ResultsMarkdownRow(r)}`).join('\n')}
##

${certified ? badge : null}
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
      <StlButton primary disabled={disabled}
        onClick={()=>this.setState({openModal:true})} semantic>{format}</StlButton>
      <Modal
        closeIcon
        onClose={() => this.setState({openModal:false})}
        open={openModal}
        style={{
          backgroundColor: 'Black',
          width: '81%',
          height: '81%',
          // maxWidth: 600,
          color: 'White',
          margin: 'auto',
          marginTop: '9%'
        }}
      >
        <div className={`copy-results theme-modal ${productCode}-theme`}>
          <h2 className="primary-color">Publish Your Test Results as Certified Code on GitHub or Bitbucket</h2>
          <CopyToClipboard text={markdown}
              onCopy={() => {
                if (!this.agree.checked) alert('You must agree by checking the box')
                else {
                  this.refs.markdown.select()
                  this.publishResults()
                }
              }}>
                <textarea ref="markdown" style={{
                  width: '100%',
                  height: '72%',
                  marginBottom: 18,
                }}>{markdown}</textarea>
          </CopyToClipboard>
          <input type="checkbox" name="agree" ref={r => this.agree = r} />
          <label for="agree">&nbsp; I want to publish these results publicly for all to see.</label>
          <div style={{ height: 15 }} />
          <StlButton className={'link close-markdown-modal'}
            onClick={() => this.setState({openModal:false})}
            style={{ float: 'right', fontSize: '150%' }}>
            close
          </StlButton>
          <CopyToClipboard text={markdown}
            onCopy={() => {
              if (!this.agree.checked) alert('You must agree by checking the box')
              else this.publishResults()
            }}>
            <StlButton semantic>
              {`Copy and Publish Results`}
            </StlButton>
          </CopyToClipboard>
          {copied ? <span style={{color: 'red'}}>&nbsp;Copied to clipboard.</span> : null}

        </div>
      </Modal> 
    </React.Fragment>
  }
}
