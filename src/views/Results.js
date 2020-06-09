import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Label, Table } from 'semantic-ui-react'
import moment from 'moment'
import queryString from 'query-string'

// components
// import CopyResultsModal from '../components/CopyResultsModal'
import Loader from '../components/Loader'
import ResultsRow from '../components/ResultsRow'
import StlButton from '../components/StlButton'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import CqcApi from '../helpers/cqcApi'
import { getCookie } from '../helpers/cookies'
import { base64ToBlob, decodedRepoName, testStatusToColor } from '../helpers/strings'
import { groupedResultsJson } from '../helpers/data'
import { appUrl, helpEmail } from '../config'
import { durationBreakdown } from '../helpers/moment'

// images and styles
import '../assets/css/Results.css'
import ftlLogo from '../assets/images/logo-1-line-black-text.png'
import ThemeLogo from '../components/ThemeLogo'

const cqcApi = CqcApi(getCookie("session"))

export default class Results extends Component {
  static contextType = UserContext
  state = {}

  /** @dev Lifecycle methods */
  async componentWillMount() {
    const scan = queryString.parse(document.location.search)['scan']
    const published = queryString.parse(document.location.search)['published']
    const testId = queryString.parse(document.location.search)['test']
    const treeSha = queryString.parse(document.location.search)['tree']
    this.setState({
      scan,
      published,
      testId,
      treeSha,
    })

    await api.setSid( getCookie("STL-SID") )
    await cqcApi.setSid( getCookie("STL-SID") )
    const fetchedUser = await this.context.actions.fetchUser()

    this.setState({
      theme: getCookie("theme"),
      fetchedUser,
      failedToFetchError: null,
    })
  }
  
  async componentDidMount() {
    const published = queryString.parse(document.location.search)['published']
    let state = await this._fetchResults()
    if (state && !state.results) state.results = false
    if (state && state.results && state.project) {
      let pdfReady = false
      try {
        let status = state['results']['test_run']['status_msg']
        if (status === 'COMPLETE') pdfReady = true
        else if (!published) this._retryPdf()
      } catch(e) {}
      this.setState({
        ...state,
        pdfReady
      })
    }
    else {
      // log the failure
      this._failedToFetch(state ? state.project : null)
      // and try again
      this.setState(await this._fetchResults())
    }
  }

  /** @dev Component methods */
  _retryPdf = async () => {
    /** @todo set interval to keep fetching until status is COMPLETE */
    
    let i 
    i = setInterval(async () => {
      const results = await this._fetchResults()
      if (results && !results.results) results.results = false
      if (results && results.results && results.project) {
        const status = results['results']['test_run']['status_msg']
        if (status === 'COMPLETE') {
          const pdfReady = true
          clearInterval(i)
          this.setState({pdfReady})
        }
      }
    }, 4500)
    
  }

  _fetchResults = async () => {
    this.setState({ failedToFetchError: null })
    const { scan, published, testId } = this.state

    let results
    if (published) {
      const { data: publishedResults } = await cqcApi.getResults(
        this.props.match.params.id
      ).catch(this._failedToFetch)
      results = publishedResults
    }
    else if (scan) {
      const webhookScan = await cqcApi.getWebhookScan(scan).catch(this._failedToFetch)
      results = webhookScan['testResults']
    }
    else if (testId) {
      const { data: bugcatcherResults } = await api.getTestResult({
        stlid: testId,
      }).catch(this._failedToFetch)
      results = bugcatcherResults
    }

    let { test_run: testRun = {} } = results || {}
    const { codes, project ={} } = testRun
    const { name } = project
    const projectName = decodedRepoName(name)

    if (results && projectName) {
      // window.mixpanel.track('Fetched Results', {
      //   stlid: this.props.match.params.id,
      //   project,
      //   version,
      // })
    }
    else this._failedToFetch()

    return({ project: projectName, results })
  }

  _failedToFetch = error => {
    if (error) {
      console.error(error)
      if (error.message.match('404')) error = new Error(`Results not found for your User / Test ID combination.`)
      this.setState({ failedToFetchError: error })
    }
    else if (!this.state.failedToFetchError) {
      this.setState({ failedToFetchError: new Error(`Fetch Results failed.`) })
    }
    return {}
  }

  _fetchPDF = async (e) => {
    const { scan, testId: test } = this.state
    const qs = scan ? `scan=${scan}` : `test=${test}`
    const url = `${appUrl}/results/pdf?${qs}`
    window.open(url, "_blank")
  }

_fetchJSON = () => {
    const blob = new Blob([JSON.stringify(this.state.results)], { type: 'application/json' })
    const objectUrl = window.URL.createObjectURL(blob)
    window.open(objectUrl, "_self")
  }

  render() {
    const {
      failedToFetchError,
      scan,
      loading,
      pdfReady,
      project,
      published,
      results,
      showFiles,
      testId,
      treeSha,
    } = this.state

    return <div>
      <section id="results">
        <UserContext.Consumer>
          {(userContext) => {
            const { user, userDataLoaded } = userContext ? userContext.state : {}

            // show results not found
            if (published && results && results.error) return <h1>Not found.</h1>

            // show results
            else if ((user || published) && results && !loading) {
              // parse out some data we want to display
              let { test_run: testRun, test_run_result: testRunResult } = results
              const status = testRun.status_msg
              const color = testStatusToColor(status)
              const startTest = moment(testRun.start)
              const endTest = moment(testRun.end)
              const { filetype: fileType, project: projectName } = testRun.codes[0] || {}
              let languagesUsed = fileType !== 'None' ? [fileType] : []
              let testToolsUsed = []
              if (!Array.isArray(testRunResult)) testRunResult = []
              if (projectName && !project) project = projectName

              let [groupedResults, certified] = groupedResultsJson(testRunResult, project)
              const GroupedResults = () => {
                const rows = groupedResults
                if (!rows.length) return <h1 style={{ color: 'green' }}>Passing all tests!</h1>
                else return rows.map((r, i) => <ResultsRow key={i}
                  user={user}
                  {...r} />)
              }

              // iterate through results for languages and tools
              testRunResult.forEach((r, i) => {
                if (
                  r.test_suite_test.test_suite.language !== 'None' &&
                  !languagesUsed.includes(r.test_suite_test.test_suite.language)
                ) languagesUsed.push(r.test_suite_test.test_suite.language)
                if (!testToolsUsed.includes(r.test_suite_test.test_suite.name)) testToolsUsed.push(r.test_suite_test.test_suite.name)
              })

              const languagesUsedBadges = languagesUsed.map(l => <span
                className="badge primary" key={l}>
                {l}
              </span>)
              const testToolsUsedBadges = testToolsUsed.map(t => <span
                className="badge secondary" key={t}>
                {t}
              </span>)

              const markdownPayload = {
                groupedResults,
                languagesUsed,
                project,
                results,
                testId: this.props.match.params.id,
                testToolsUsed
              }

              const fileCount = results.test_run.codes.length
              const filesTested = () => results.test_run.codes.map(c => <span>{c.name}<br /></span>)

              // return the styled test results
              return <div>
                <h3 style={{ textAlign: 'center', marginBottom: 36,
                  display: published ? 'none' : 'inline-block'
                }}>Feedback or bug reports about the BugCatcher beta? Email <a href={`mailto:${helpEmail}`}>{helpEmail}</a></h3>
                <div className="container results-container">
                  <header style={{ marginBottom: 15 }}>
                    <a href={'https://fasterthanlight.dev'}>
                      <img src={ftlLogo} style={{
                        width: 360,
                        float: 'right'
                      }} />
                    </a>
                    <Link to={`/`}>
                      <ThemeLogo productCode={this.state.theme}
                        style={{
                          width: 210
                        }} />
                    </Link>
                  </header>
                  <Link to={`/project/${encodeURIComponent(project)}${scan ? `?scan=${scan}` : ''}`}
                     style={{
                       display: published ? 'none' : 'inline-block',
                       fontSize: '120%',
                       marginLeft: 12,
                      }}>
                    &laquo; back to project
                  </Link>
                  <Table color={color}>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell colSpan={2}>
                          <span style={{fontSize:'120%'}}>Project: </span>
                          {
                            decodeURIComponent(project).match('/tree/') ?
                            <a href={`https://github.com/${decodeURIComponent(project)}`} target="_blank" style={{fontSize:'150%'}} className={'dont-break-out'}>{decodeURIComponent(project)}</a> :
                            <Link to={`/project/${project}`} style={{fontSize:'150%'}} className={'dont-break-out'}>{decodeURIComponent(project)}</Link>
                          }
                        </Table.HeaderCell>
                        <Table.HeaderCell>
                          <Label ribbon={'right'} color={color} style={{fontSize: '120%', display: published ? 'none' : 'inline-block' }}>Testing: {status}</Label>
                        </Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      <Table.Row>
                        <Table.Cell className="grey-color light-grey-bg-color">Test ID</Table.Cell>
                        <Table.Cell colSpan={2}><code>{testId || scan}</code></Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell className="grey-color light-grey-bg-color">Test initiated</Table.Cell>
                        <Table.Cell>{startTest.format('llll')}</Table.Cell>
                        <Table.Cell>(completed in {durationBreakdown(startTest, endTest)})</Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell className="grey-color light-grey-bg-color">Languages found</Table.Cell>
                        <Table.Cell colSpan={2}>{languagesUsedBadges}</Table.Cell>
                      </Table.Row>
                      <Table.Row style={{ display: testToolsUsed.length ? 'table-row' : 'none' }}>
                        <Table.Cell className="grey-color light-grey-bg-color">Tools used</Table.Cell>
                        <Table.Cell colSpan={2}>{testToolsUsedBadges}</Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell className="grey-color light-grey-bg-color">Files tested</Table.Cell>
                        <Table.Cell colSpan={2}>
                          <a onClick={() => {this.setState({showFiles: false})}}
                            style={{display: showFiles ? 'block' : 'none'}}>(hide files)</a>
                          {showFiles ? filesTested() : ''}
                          <a onClick={() => {this.setState({showFiles: !showFiles})}}>
                            {showFiles ? '(hide files)' : `show ${fileCount} files`}
                          </a>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell className="grey-color light-grey-bg-color">Download Results</Table.Cell>
                        <Table.Cell colSpan={2}>
                          <StlButton semantic primary
                            // disabled={!pdfReady}
                            onClick={this._fetchPDF}>PDF</StlButton>
                          &nbsp;&nbsp;
                          <StlButton semantic onClick={this._fetchJSON}>JSON</StlButton>
                       </Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table>

                  {
                    // (published || process.env.REACT_APP_FTL_ENV === 'production' || !certified) ? null : <div>
                    //   <Table color={'green'}>
                    //     <Table.Header>
                    //       <Table.Row>
                    //         <Table.HeaderCell colSpan={2} style={{ width: '66%' }}>
                    //           <span style={{fontSize:'150%'}} className={'dont-break-out'}>Code Quality Certification</span>
                    //         </Table.HeaderCell>
                    //         <Table.HeaderCell>
                    //           <Label ribbon={'right'} color={'green'} style={{fontSize: '120%'}}>Certification: PASSED</Label>
                    //         </Table.HeaderCell>
                    //       </Table.Row>
                    //     </Table.Header>

                    //     <Table.Body>
                    //       <Table.Row>
                    //         <Table.Cell className="grey-color light-grey-bg-color"
                    //           style={{ width: '33%' }}>
                    //           Publish Your Certification
                    //         </Table.Cell>
                    //         <Table.Cell colSpan={2}>
                    //           <CopyResultsModal {...this.props}
                    //             treeSha={treeSha}
                    //             markdownPayload={markdownPayload}
                    //             disabled={!pdfReady}
                    //             certified={certified}
                    //             format={'Publish Results'}
                    //             user={user} />
                    //           &nbsp;Publish this markdown to your repository.
                    //       </Table.Cell>
                    //       </Table.Row>
                    //     </Table.Body>
                    //   </Table>
                    // </div>
                  }

                  <GroupedResults />

                </div>
              </div>
            }
            
            // show loader
            else if (loading || (!user && !userDataLoaded)) return <Loader />

            // show login message
            else if (!user && userDataLoaded) return <h1>Please <Link to={'/'}>log in</Link>.</h1>
            
            // show security message
            else if (results === false) return <h1>Not found.</h1>

            // results not found
            else if ((results && !results.length) || results === null) return <h1>Test results not found.</h1>

            // results not found: custom error message
            else if (failedToFetchError) return <h3>{failedToFetchError.message}</h3>

            else return <Loader />
          }}
        </UserContext.Consumer>
      </section>
    </div>
  }
}
