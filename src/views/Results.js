import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Label, Table } from 'semantic-ui-react'
import moment from 'moment'
import queryString from 'query-string'

// components
import CopyResultsModal from '../components/CopyResultsModal'
import Loader from '../components/Loader'
import ResultsRow from '../components/ResultsRow'
import StlButton from '../components/StlButton'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import { getCookie } from '../helpers/cookies'
import { severities, testStatusToColor } from '../helpers/strings'
import { helpEmail } from '../config'
import { durationBreakdown } from '../helpers/moment'

// images and styles
import '../assets/css/Results.css'
import ftlLogo from '../assets/images/logo-1-line-black-text.png'
import ThemeLogo from '../components/ThemeLogo'

// constants
const sortRowsByFileLine = (a, b) =>
  String(a.code.name + a.start_line).localeCompare(
    String(b.code.name + b.start_line)
  )

export default class Results extends Component {
  static contextType = UserContext
  state = {}

  /** @dev Lifecycle methods */
  async componentWillMount() {
    await api.setSid( getCookie("STL-SID") )
    const fetchedUser = await this.context.actions.fetchUser()
    this.setState({ theme: getCookie("theme"), fetchedUser, failedToFetchError: null })
  }
  
  async componentDidMount() {
    let state = await this._fetchResults()
    if (state && !state.results) state.results = false
    if (state && state.results && state.project) {
      let pdfReady = false
      try {
        let status = state['results']['test_run']['status_msg']
        if (status === 'COMPLETE') pdfReady = true
        else this._retryPdf()
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
    let { data: results } = await api.getTestResult({
      stlid: this.props.match.params.id,
    }).catch(this._failedToFetch)
    let { test_run: testRun = {} } = results || {}
    const { codes = [{}] } = testRun
    const { project } = codes[0]
    if (results && project) {
      // window.mixpanel.track('Fetched Results', {
      //   stlid: this.props.match.params.id,
      //   project,
      //   version,
      // })
    }
    else this._failedToFetch()
    
    return({ project, results })
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

  _fetchPDF = async () => {
    this.setState({ loading: true })
    const fail = () => { alert("Error fetching results") }
    const response = await api.getTestResult({
      stlid: this.props.match.params.id,
      format: 'pdf',
      options: {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/pdf'
        },
        responseType: "blob"
      }
    }).catch(fail)

    this.setState({ loading: false })
    if (response && response.data && response.data.size > 5) {
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const objectUrl = window.URL.createObjectURL(blob)
      window.open(objectUrl, "_self")
    }
    else fail()
  }

  _fetchJSON = () => {
    const blob = new Blob([JSON.stringify(this.state.results)], { type: 'application/json' })
    const objectUrl = window.URL.createObjectURL(blob)
    window.open(objectUrl, "_self")
  }

  render() {
    const {
      failedToFetchError,
      loading,
      pdfReady,
      results,
      showFiles
    } = this.state
    const ghTreeSha = queryString.parse(document.location.search)['gh']
    let certified = true
    const groupedResultsJson = (testRunResult, project) => {
      /**
       * @dev Arrange results into Grouped Rows
       */

      const reducedResults = testRunResult.reduce((acc, item) => {
        const { test_suite_test: test } = item
        const { ftl_severity: severity } = test
        if (severity === 'medium' || severity === 'high') certified = false
        acc[severity] = acc[severity] || []
        acc[severity].push(item)
        return acc
      }, {})
      severities.forEach(s => {
        if (!reducedResults[s]) reducedResults[s] = []
      })

      /** @dev Sort results */
      const titleReducer = (acc, item) => {
        const { test_suite_test: test } = item
        const { ftl_short_description: title } = test
        acc[title] = acc[title] || []
        acc[title].push(item)
        return acc
      }

      reducedResults.high = new Map(Object.entries(reducedResults.high.reduce(titleReducer, {}))) || []
      reducedResults.medium = new Map(Object.entries(reducedResults.medium.reduce(titleReducer, {}))) || []
      reducedResults.low = new Map(Object.entries(reducedResults.low.reduce(titleReducer, {}))) || []
      reducedResults.info = new Map(Object.entries(reducedResults.info.reduce(titleReducer, {}))) || []

      const descriptionReducer = (acc, item) => {
        const { test_suite_test: test } = item
        const { ftl_long_description: description } = test
        acc[description] = acc[description] || []
        acc[description].push(item)
        return acc
      }
      let groupedResults = {}
      Object.entries(reducedResults).forEach(r => {
        const key = r[0]
        const value = r[1]
        let m = new Map()
        Array.from(value).forEach(v => {
          m.set(v[0], v[1].reduce(descriptionReducer, {}))
        })
        groupedResults[key] = m
      })

      const groupedResultsArray = [].concat(
        groupedResults.high,
        groupedResults.medium,
        groupedResults.low,
        groupedResults.info
      )

      let rows = []
      groupedResultsArray.forEach((titlesGroup, i) => {
        const titles = Array.from(titlesGroup)
        if (titles && titles.length)
          titles.forEach(t => {
            const hits = Object.entries(t[1]).map(d => {
              return {
                project,
                testId: d[1][0]['test_suite_test']['ftl_test_id'],
                testResultId: d[1][0]['test_run_result_id'],
                annotation: d[1][0]['project_annotation'],
                severity: severities[i],
                title: t[0],
                description: d[0],
                location: d[1].sort(sortRowsByFileLine).map(f => ([
                  `${f.code.name} (lines ${f.start_line} - ${f.end_line})`,
                  f.commentary
                ])),
                resources: d[1].map(h =>
                  typeof h.test_suite_test.more_information_uris === 'object' ?
                  JSON.parse(
                    h.test_suite_test.more_information_uris.replace(/'/g, '"')
                  ) : []
                )[0],
              }
            })
            rows.push(hits)
          })
      })
      return rows.flat()
    }
    return <div>
      <section id="results">
        <UserContext.Consumer>
          {(userContext) => {
            const { user, userDataLoaded } = userContext ? userContext.state : {}

            // show results
            if (user && results && !loading) {
              // parse out some data we want to display
              let { test_run: testRun, test_run_result: testRunResult } = results
              const status = testRun.status_msg
              const color = testStatusToColor(status)
              const startTest = moment(testRun.start)
              const endTest = moment(testRun.end)
              const { filetype: fileType, project } = testRun.codes[0]
              let languagesUsed = fileType !== 'None' ? [fileType] : []
              let testToolsUsed = []
              if (!Array.isArray(testRunResult)) testRunResult = []

              let groupedResults = groupedResultsJson(testRunResult, project)

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
                <h3 style={{ textAlign: 'center', marginBottom: 36 }}>Feedback or bug reports about the BugCatcher beta? Email <a href={`mailto:${helpEmail}`}>{helpEmail}</a></h3>
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
                  <Link to={`/project/${encodeURIComponent(project)}`}
                     style={{ fontSize: '120%', marginLeft: 12 }}>
                    &laquo; back to project
                  </Link>
                  <Table color={color}>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell colSpan={2}>
                          <span style={{fontSize:'120%'}}>Project: </span>
                          <span style={{fontSize:'150%'}} className={'dont-break-out'}>{project}</span>
                        </Table.HeaderCell>
                        <Table.HeaderCell>
                          <Label ribbon={'right'} color={color} style={{fontSize: '120%'}}>Testing: {status}</Label>
                        </Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      <Table.Row>
                        <Table.Cell className="grey-color light-grey-bg-color">Test ID</Table.Cell>
                        <Table.Cell colSpan={2}><code>{this.props.match.params.id}</code></Table.Cell>
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
                            disabled={!pdfReady}
                            onClick={this._fetchPDF}>PDF</StlButton>
                          &nbsp;&nbsp;
                          <StlButton semantic onClick={this._fetchJSON}>JSON</StlButton>
                       </Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table>

                  {
                    (process.env.REACT_APP_FTL_ENV === 'production' || !certified) ? null : <div>
                      <Table color={'green'}>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell colSpan={2} style={{ width: '66%' }}>
                              <span style={{fontSize:'150%'}} className={'dont-break-out'}>Code Quality Certification</span>
                            </Table.HeaderCell>
                            <Table.HeaderCell>
                              <Label ribbon={'right'} color={'green'} style={{fontSize: '120%'}}>Certification: PASSED</Label>
                            </Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>

                        <Table.Body>
                          <Table.Row>
                            <Table.Cell className="grey-color light-grey-bg-color"
                              style={{ width: '33%' }}>
                              Publish Your Certification
                            </Table.Cell>
                            <Table.Cell colSpan={2}>
                              <CopyResultsModal {...this.props}
                                ghTreeSha={ghTreeSha}
                                markdownPayload={markdownPayload}
                                format={'Publish Results'} />
                              &nbsp;Publish this markdown to your repository.
                          </Table.Cell>
                          </Table.Row>
                        </Table.Body>
                      </Table>
                    </div>
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
