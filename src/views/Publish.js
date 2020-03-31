import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Table } from 'semantic-ui-react'
import queryString from 'query-string'
import { CopyToClipboard } from 'react-copy-to-clipboard'

// components
import Loader from '../components/Loader'
import StlButton from '../components/StlButton'
import ResultsMarkdownRow from '../components/ResultsMarkdownRow'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import cqcApi from '../helpers/cqcApi'
import githubApi from '../helpers/githubApi'
import { getCookie } from '../helpers/cookies'
import { severities } from '../helpers/strings'
import { appUrl, github } from '../config'
import { durationBreakdown } from '../helpers/moment'

// images and styles
import '../assets/css/Results.css'

// constants
const sortRowsByFileLine = (a, b) =>
  String(a.code.name + a.start_line).localeCompare(
    String(b.code.name + b.start_line)
  )
const { tokenCookieName } = github

export default class Publish extends Component {
  static contextType = UserContext
  state = {}

  /** @dev Lifecycle methods */
  async componentWillMount() {
    await api.setSid( getCookie("STL-SID") )
    const user = await this.context.actions.fetchUser()
    const fetchedResults = await this._fetchResults()
    const fetchedJob = await this._fetchJob(user)
    
    let token = getCookie(tokenCookieName)
    if (token) {
      await githubApi.setToken(token)
    }

    this.setState({
      ...fetchedResults,
      fetchedJob,
      theme: getCookie("theme"),
      token,
      user,
      failedToFetchError: null,
    })
    await this._publishResults(fetchedResults['results'])
  }
  
  /** @dev Component methods */
  _fetchJob = async (user) => {
    const { data: jobs } = await cqcApi.getJobsQueue(user)
    return Array.isArray(jobs) ? jobs.find(j => 
      j.testId === this.props.match.params.id &&
      j.treeSha === queryString.parse(document.location.search)['gh']
    ) : null
  }

  _fetchResults = async () => {
    this.setState({ failedToFetchError: null })
    let { data: results } = await api.getTestResult({
      stlid: this.props.match.params.id,
    }).catch(this._failedToFetch)

    let { test_run: testRun = {} } = results || {}
    const { codes = [{}] } = testRun
    const { project } = codes[0]
    if (results && project) return({ project, results })
    else return this._failedToFetch()
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

  _fetchJSON = () => {
    const blob = new Blob([JSON.stringify(this.state.results)], { type: 'application/json' })
    const objectUrl = window.URL.createObjectURL(blob)
    window.open(objectUrl, "_self")
  }

  _copyLink = () => {
    this.setState({ copiedLink: true })
    setTimeout(
      () => {
        this.setState({ copiedLink: false })
      }, 6000
    )
  }

  _copyMarkdown = () => {
    this.setState({copiedMarkdown: true})    
    setTimeout(
      () => {
        this.setState({ copiedMarkdown: false })
      }, 6000
    )
  }

  _publishResults = async (results) => {
    const { user } = this.state
    if (!user || !results) return

    // append user object to results
    results.user = user

    // push results to cqc server
    const putResults = await cqcApi.putResults(results).catch(() => null)
    
    if (!putResults) console.error(
      new Error('error pushing results to proxy server')
    )

  }
  
  render() {
    const {
      copiedLink,
      copiedMarkdown,
      disablePrButton,
      failedToFetchError,
      fetchedJob,
      loading,
      // markdownPayload,
      // pdfReady,
      // productCode,
      results,
      token,
    } = this.state
    const prUrl = fetchedJob ? fetchedJob.pullRequest : null
    const ghTreeSha = queryString.parse(document.location.search)['gh']
    const owner = queryString.parse(document.location.search)['owner']
    const repo = queryString.parse(document.location.search)['repo']
    const branch = queryString.parse(document.location.search)['branch']

    let certified = true
    const groupedResultsJson = (testRunResult, project) => {
      /**
       * @dev Arrange results into Grouped Rows
       */

      const reducedResults = testRunResult.reduce((acc, item) => {
        const { test_suite_test: test } = item
        const { ftl_severity: severity } = test
        if (severity === 'high') certified = false
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


    let markdownPayload
    if (results) {
      // parse out some data we want to display
      let { test_run: testRun = {}, test_run_result: testRunResult } = results
      // const status = testRun.status_msg
      const { filetype: fileType, project } = testRun.codes[0]
      let languagesUsed = fileType !== 'None' ? [fileType] : []
      let testToolsUsed = []
      if (!Array.isArray(testRunResult)) testRunResult = []

      let groupedResults = groupedResultsJson(testRunResult, project)

      // iterate through results for languages and tools
      testRunResult.forEach((r, i) => {
        if (
          r.test_suite_test.test_suite.language !== 'None' &&
          !languagesUsed.includes(r.test_suite_test.test_suite.language)
        ) languagesUsed.push(r.test_suite_test.test_suite.language)
        if (!testToolsUsed.includes(r.test_suite_test.test_suite.name)) testToolsUsed.push(r.test_suite_test.test_suite.name)
      })

      markdownPayload = {
        groupedResults,
        languagesUsed,
        project,
        results,
        testId: this.props.match.params.id,
        testToolsUsed
      }
    }

    const { groupedResults, languagesUsed = [], project, testId, testToolsUsed = [] } = markdownPayload || {}
    const approvedBadgeUrl = `${appUrl}/img/badge.png`
    const badge = `<a href="${appUrl + '/results/' + testId}?published=1" target="_blank"><img src="${approvedBadgeUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" /></a>`
    const badgeAndText = `### Passing All Tests!\n${badge}`
    const logoUrl = `${appUrl}/img/logo.png`
    const treeSha = ghTreeSha && ghTreeSha != 'undefined' ? `\n**GitHub Tree SHA**: \`${ghTreeSha}\`` : ''
    const elapsed = results && results.test_run ? durationBreakdown(results.test_run.start, results.test_run.end) : null

    
    const markdown = (() => {
      return !markdownPayload ? null : `<img src="${logoUrl}" alt="Faster Than Light BugCatcher" title="Faster Than Light BugCatcher" width="300" />

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

    return <div style={{ minHeight: '100vh', background: '#fff' }}>
      <section id="results" className={'container'}>
        <UserContext.Consumer>
          {(userContext) => {
            const { user, userDataLoaded } = userContext ? userContext.state : {}

            // show results not found
            if (results && results.error) return <h1>Not found.</h1>

            // show publishing options
            else if ((user) && results && !loading) {
              const resultsUrl = `${appUrl}/results/${testId}?published=1`

              // return the styled test results
              return <div>

                  {
                    (process.env.REACT_APP_FTL_ENV === 'production' || !certified) ? null : <div>
                      <Table color={'blue'}>
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell colSpan={3}>
                              <span style={{fontSize:'150%'}} className={'dont-break-out'}>Publish Your Test Results</span>
                            </Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>

                        <Table.Body>
                        <Table.Row>
                            <Table.Cell className="grey-color light-grey-bg-color"
                              style={{ width: '33%' }}>
                              Repository
                            </Table.Cell>
                            <Table.Cell colSpan={2}>
                              <code>{owner}/{repo}/tree/{branch}</code>
                            </Table.Cell>
                          </Table.Row>
                          <Table.Row>
                            <Table.Cell className="grey-color light-grey-bg-color"
                              style={{ width: '33%' }}>
                              Sharable Link
                            </Table.Cell>
                            <Table.Cell colSpan={2}>
                              <h3>Copy and Paste a URL to your Published Test Results</h3>
                              <CopyToClipboard text={resultsUrl}
                                onCopy={this._copyLink}>
                                <StlButton link>
                                  {resultsUrl}
                                </StlButton>
                              </CopyToClipboard>
                              <CopyToClipboard text={resultsUrl}
                                onCopy={() => { this._copyLink(markdownPayload) }}>
                                <StlButton>
                                  Copy Link
                                </StlButton>
                              </CopyToClipboard>
                              {copiedLink ? <span style={{color: 'red'}}>&nbsp;Copied to clipboard.</span> : null}
                            </Table.Cell>
                          </Table.Row>
                          <Table.Row>
                            <Table.Cell className="grey-color light-grey-bg-color"
                              style={{ width: '33%' }}>
                              Copy Results as Markdown
                            </Table.Cell>
                            <Table.Cell colSpan={2}>
                              <div>
                                <h3>Publish Your Test Results as Certified Code on GitHub or Bitbucket, etc.</h3>
                                <p>Publish this markdown to your repository.</p>
                                <CopyToClipboard text={markdown}
                                    onCopy={() => { this._copyMarkdown(markdownPayload) }}>
                                      <textarea style={{
                                        width: '100%',
                                        height: '72%',
                                        marginBottom: 18,
                                      }}>{markdown}</textarea>
                                </CopyToClipboard>
                                <CopyToClipboard text={markdown}
                                  onCopy={() => { this._copyMarkdown(markdownPayload) }}>
                                  <StlButton>
                                    Copy Markdown
                                  </StlButton>
                                </CopyToClipboard>
                                {copiedMarkdown ? <span style={{color: 'red'}}>&nbsp;Copied to clipboard.</span> : null}
                              </div>

                            </Table.Cell>
                          </Table.Row>
                          <Table.Row>
                            <Table.Cell className="grey-color light-grey-bg-color"
                              style={{ width: '33%' }}>
                              Create a Pull Request on GitHub
                            </Table.Cell>
                            <Table.Cell colSpan={2}>
                              <div>
                                <h3>Create a Pull Request to Publish Results Markdown at {owner}/{repo}</h3>
                                <StlButton
                                  onClick={async () => {
                                    this.setState({
                                      prError: null,
                                      prSuccess: null,
                                      disablePrButton: true,
                                    })
                                    const pr = await githubApi.createPullRequest({
                                      owner,
                                      repo,
                                      treeSha,
                                      resultsMarkdown: markdown,
                                      selectedBranch: branch,
                                      commitMessage: 'testing pull requests',
                                      prBody: 'pr body',
                                      changeSetArray: [
                                        {
                                          new: true,
                                          path: 'BUGCATCHER_CERTIFIED.md',
                                          payload: markdown,
                                        }
                                      ],
                                    })
                                    .catch(c => {
                                      this.setState({
                                        prError: c.message,
                                        disablePrButton: null,
                                      })
                                    })
                                    if (pr) {
                                      const createdPR = await cqcApi.postPullRequestUrl({
                                        prUrl: pr.html_url,
                                        testId,
                                        user,
                                      })
                                      console.log({createdPR})
                                      this.setState({
                                        prSuccess: pr.html_url,
                                        disablePrButton: null,
                                      })
                                    }
                                  }}
                                  disabled={!token || disablePrButton}>Create GitHub Pull Request</StlButton>
                                <div style={{color: 'Red'}}>{this.state.prError}</div>
                                <div style={{
                                  marginTop: 12,
                                  display: prUrl || this.state.prSuccess ? 'block' : 'none',
                                }}>
                                  <strong>Pull Request Created:</strong><br />
                                  <a href={prUrl || this.state.prSuccess}>{prUrl || this.state.prSuccess}</a>
                                </div>
                              </div>

                            </Table.Cell>
                          </Table.Row>
                        </Table.Body>
                      </Table>
                    </div>
                  }

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
