import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import queryString from 'query-string'
import {
  Form,
  Icon,
  Loader,
  Radio,
  Select,
  Table,
  TextArea
} from 'semantic-ui-react'
import { sha256 } from 'js-sha256'

// components
import FtlLoader from '../components/Loader'
import Menu from '../components/Menu'

// helpers
import api from '../helpers/api'
import { appUrl, github } from '../config'
import { getCookie, setCookie } from '../helpers/cookies'
import githubApi from '../helpers/githubApi'
import LocalStorage from '../helpers/LocalStorage'

// images & styles
import bugcatcherShield from '../assets/images/bugcatcher-shield-square.png'
import githubLogo from '../assets/images/github-logo.png'
import StlButton from '../components/StlButton'
import '../assets/css/CQC.css'

/** Constants */
const uploadsPerSecond = 0 // 0 = unlimited
const constStatus = {
    'COMPLETE': 'COMPLETE',
    'COMPUTING': 'COMPUTING',
    'COMPUTING_PDF': 'COMPUTING_PDF',
    'FETCHING': 'FETCHING',
    'INIT': 'INIT',
    'QUEUED': 'QUEUED',
    'RUNNING': 'RUNNING',
    'SETUP': 'SETUP',
    'UPLOADED': 'UPLOADED',
    'UPLOADING': 'UPLOADING'
  },
  maxConcurrentUploads = 99,
  millisecondTimeout = Math.floor(1000 / uploadsPerSecond),
  uiUploadThreshold = 1000,
  retryAttemptsAllowed = 300,
  retryIntervalMilliseconds = 9000,
  strStatus = {
    [constStatus.COMPUTING_PDF]: 'Test Complete!',
    [constStatus.RUNNING]: 'Running Tests...',
    [constStatus.SETUP]: 'Setting up Tests...',
  }
const ACTIVE_TESTING_STATUSES = [
  constStatus.COMPUTING,
  constStatus.COMPUTING_PDF,
  constStatus.FETCHING,
  constStatus.INIT,
  constStatus.RUNNING,
  constStatus.SETUP,
  constStatus.UPLOADED,
  constStatus.UPLOADING
]
const FETCH_REPO_LIST_COOKIENAME = "fetchRepoList"
const MILISECOND_INTERVAL_FOR_STATUS_POLING = 9000
const initialState = {
  code: null,
  currentRepo: null,
  branches: [],
  branchName: null,
  redirect: null,
  repos: null,
  sortReposBy: 'full_name',
  sortReposDirection: 'asc',
  token: null,
  tree: null,
  user: null,
  working: false,
}
const { automateCookieName, tokenCookieName } = github

/** Global Variables */
let retryAttempts = 0,
  lastPercentComplete = 0,
  // projectName,
  currentUploadQueue,
  statusCheck,
  startCounting,
  testTimeElapsed = 0,
  successfulUploads = 0,
  concurrentUploads = 0,
  ghTreeSha

export default class CQC extends Component {
  constructor(props) {
    super(props)

    let token = getCookie(tokenCookieName)
    token = token.length ? token : null
    this.state = {
      ...initialState,
      automateAuth: true,
      // automateAuth: getCookie(automateCookieName) == 'true',
      token,
    }

    this._toggleAutomateOption = this._toggleAutomateOption.bind(this)
    this.ApiFunctions = this.ApiFunctions.bind(this)
    this.RepoList = this.RepoList.bind(this)
    this._getTree = githubApi.getTree.bind(this)
  }

  async componentWillMount() {
    this.setState({ working: true })

    // handle tokens and auth codes
    const code = queryString.parse(document.location.search)['code']
    let { token, user } = this.state
    let redirect
    if (!token && code) {
      token = await this.fetchToken()
      redirect = true
    }
    if (token) {
      await githubApi.setToken(token)
      user = await this.fetchUser()
    }

    // look for a queue in local storage
    const testingQueue = LocalStorage.BulkTestingQueue.getTestingQueue()
    const branches = testingQueue.map(q => ({...q, runningProcess: null}))
    this._persistTestingQueue(branches)

    const filteredBranches = testingQueue.length ? testingQueue.filter(
      b => b.checked
    ) : []
    const disableQueueButtons = Boolean(!filteredBranches.length)

    if (redirect) document.location.href = '/cqc'
    else this.setState({
      code: !user && code ? code : null,
      disableQueueButtons,
      user,
      working: false,
    })
  }

  componentDidMount() {
    document.addEventListener("keydown", this._fetchRepoKeydownEvent)
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._fetchRepoKeydownEvent)
    this._stopTestingQueue()
  }

  /** @dev Functions *******************************/
  _fetchRepoKeydownEvent = event => {
    if (
      event.target["id"] === 'custom_repo' && (
        event.code === 'Enter' || event.keyCode === 13
      )
    ) this.fetchCustomRepo()
  }
  
  async _toggleAutomateOption(event) {
    const automate = event.target.checked
    await setCookie(automateCookieName, automate)
    await this.setState({ automateAuth: automate })
  }
  
  _resetState = () => {
    // setCookie(tokenCookieName, '')
    this.setState(initialState)
  }

  _runApiFunctions = async () => {
    const { code, token, user } = this.state
    if (code && !token) await this.fetchToken()
    if (!user) await this.fetchUser()
  }
  
  _fetchRepoList = async () => {
    this.setState({ fetchCustomRepoErrors: null, showRepoInput: false })
    let fetchCustomRepoErrors = new Array()
    const reposText = this.repoListTextInput.value || ''
    const appendPrintedErrors = errMsg => {
      fetchCustomRepoErrors.push(errMsg)
      this.setState({ fetchCustomRepoErrors })
    }
    const removePrintedError = errMsg => {
      const fetchCustomRepoErrors = this.state.fetchCustomRepoErrors.filter(
        e => !!e.search(errMsg)
      )
      this.setState({ fetchCustomRepoErrors })
    }
    if (!reposText) {
      appendPrintedErrors('Please enter at least one owner/repo combo.')
      return
    }
    let repos = new Array()
    const validateRepoText = r => {
      if (!r.length) return
      const [ owner, repo ] = r.split('/')
      if (!owner || !repo) appendPrintedErrors(`Check format of "${r}"`)
      else repos.push([owner, repo])
    }
    if (reposText.includes('\n')) {
      reposText.split('\n').forEach(r => { validateRepoText(r.trim()) })
    }
    else validateRepoText(reposText)
    if (!repos.length) appendPrintedErrors('No repos parsed from input.')
    else {
      if (repos.length && !fetchCustomRepoErrors.length) {
        this.setState({ repoListInputDisabled: true })
        appendPrintedErrors(
          `Fetching branches of ${repos.length} repos...`
        )

        /** @todo Fetch GitHub branches for each repo */
        let fetchCustomRepoRows = new Array()
        for(let i = 0;i < repos.length;i++) {
          const branchesForRepo = await this.fetchBranches(repos[i])
            .catch(() => null)
          if (!Array.isArray(branchesForRepo))
            appendPrintedErrors(`${repos[i][0]}/${repos[i][1]} was not found.`)
          else {
            fetchCustomRepoRows.push([repos[i],branchesForRepo])
          }
        }

        removePrintedError('Fetching branches of')

        let branches = fetchCustomRepoRows.map(r => {
          const repoPath = `${r[0][0]}/${r[0][1]}`
          const repo = this.state.branches.find(b => b.repoPath === repoPath)
          const selectedBranch = repo ? repo.selectedBranch : 'master'
          return ({
            owner: r[0][0],
            repo: r[0][1],
            repoPath,
            branches: r[1],
            selectedBranch,
            status: repo ? repo.status : null,
            checked: repo && repo.checked
          })
        })
        if (!branches.length) branches = null
    

        this.setState({
          branches,
          repoListInputDisabled: null
        })

        LocalStorage.BulkTestingQueue.setTestingQueue(branches)

      }
    }
  }

  async _getBranches(currentRepo) {
    window.scrollTo({ top: 0 })
    this.setState({ working: true })
    let branches = this.fetchBranches(currentRepo.split('/'))
    this.setState({ branches, currentRepo, working: false })
  }

  _removeRowsFromQueue() {
    const removedRows = this.state.branches.filter(b => b.checked)
    if (removedRows.find(r => r.runningProcess)) clearInterval( statusCheck )
    const branches = this.state.branches.filter(
      b => !removedRows.includes(b)
    )
    if (window.confirm('Really remove?')) this._persistTestingQueue(branches)
  }

  _updateTestingQueueItem(updatedItem) {
    let { branches } = this.state
    let itemToUpdate = branches.find(
      b => b.repoPath === updatedItem.repoPath
    )
    itemToUpdate = { ...updatedItem }
    this._persistTestingQueue(branches)
  }

  _persistTestingQueue(branches) {
    this.setState({ branches })
    LocalStorage.BulkTestingQueue.setTestingQueue(branches)
  }

  async _startTestOnQueueItem(queueItem) {
    const tree = await this._getTree(
      queueItem.owner,
      queueItem.repo,
      queueItem.selectedBranch,
    )
    console.log({tree})
    this._persistTestingQueue(this.state.branches.map(b => {
      if (b.repoPath === queueItem.repoPath) return ({...b, status: 'INIT'})
      else return b
    }))
  }

  _checkTestStatus(queueItem) {
    const { testId: stlid } = queueItem
    let { reconnecting } = this.state
    if (!stlid) return
    else return new Promise(async (resolve, reject) => {
      const noConnection = (err) => {
        reconnecting = true
        this.setState({ reconnecting })
        console.error(err || new Error('GET /run_tests connection timed out. Retrying...'))
      }
      const failed = (err) => {
        alert("There was an error running the tests.")
        console.error(err || new Error('GET /run_tests returned a 502 Bad Gateway response'))
        reject()
      }

      let fetchingTest = this.state.fetchingTest || []
      fetchingTest = fetchingTest.filter(t => t.testId !== stlid)
      this.setState({ fetchingTest: [...fetchingTest, stlid] })
      const getRunTests = await api.getRunTests({ stlid }).catch(noConnection)
      this.setState({ fetchingTest })
      const { data } = getRunTests || {}
      const { response } = data || {}

      // Fail for any status in the 400's
      if (getRunTests && response && response.status >= 400 && response.status <= 499) failed()
      
      // Retry failed connections
      if (!getRunTests || !response) noConnection()
      else {
        reconnecting = false
        this.setState({ reconnecting })
      }

      // abort if stlid does not match testResultSid
      if (response && response.stlid !== stlid) {
        console.log('mismatch', response.stlid, this.state.testResultSid)
        clearInterval( statusCheck )
        reject()
      }

      // setting up the tests
      if (response && response.status_msg !== queueItem.status) {
        queueItem.status = constStatus[response.status_msg]
        this._updateTestingQueueItem(queueItem)
      }

      // update result data in `state`
      if (
        response && 
        response.percent_complete &&
        response.percent_complete >= lastPercentComplete
      ) {
        this.setState({
          reconnecting: false,
        })
      }

      // `percent_complete` has progressed
      if (
        response && 
        response.percent_complete &&
        response.percent_complete > lastPercentComplete
      ) {
        lastPercentComplete = response.percent_complete
        retryAttempts = 0
        this.setState({ reconnecting: false })
      }

      // results are ready
      if (response && (response.status_msg === 'COMPUTING_PDF' || response.status_msg === 'COMPLETE')) {
        response.percent_complete = 100
        this.setState({ reconnecting: false })
        resolve(response)
      }

      // the incoming response is from the current test
      else if (reconnecting || response.stlid === stlid) {
        // we should be fetching or not
        if (
          !this.state.fetchingTest.includes(stlid) &&
          (retryAttempts <= retryAttemptsAllowed || lastPercentComplete === 0)
        ) {
          retryAttempts++
          console.log(`Test Status request #${retryAttempts} at ${lastPercentComplete}% complete`)
          statusCheck = setTimeout(
            () => { resolve(this._checkTestStatus(queueItem)) },
            retryIntervalMilliseconds
          )
        }
        else reject()
      }
      else reject()
    })
  }

  _runTests = async (queueItem) => {
    queueItem.runningProcess = true
    this._updateTestingQueueItem(queueItem)

    const { owner, repo, selectedBranch } = queueItem
    const projectName = `${owner}_${repo}_${selectedBranch}`

    clearTimeout( statusCheck )
    clearInterval( startCounting )
    statusCheck = null
    startCounting = setInterval(this._countUp, 1000)
    testTimeElapsed = 0
    successfulUploads = 0

    // tell the server to run tests
    const runTestsError = (err) => {
      err = err || new Error('POST /run_tests returned a bad response')
      alert(err.message)
      console.error(err)
      return null
    }
    const runTests = await api.postTestProject({ projectName }).catch(runTestsError)
    if (runTests) {
      const { stlid, status } = runTests.data
      queueItem.testId = stlid
      queueItem.status = constStatus[status]
      this._updateTestingQueueItem(queueItem)
      this._initCheckTestStatus(queueItem)
    }
  }

  async _initCheckTestStatus(queueItem) {
    clearTimeout( statusCheck )
    lastPercentComplete = 0

    const checkStatusError = (err) => {
      err = err || new Error('GET /run_tests returned a bad response')
      console.error(err)
      return null
    }

    const results = await this._checkTestStatus(queueItem)//.catch(checkStatusError)
    if (!results) checkStatusError()
    else {
      if (results.status_msg === constStatus.COMPUTING_PDF || results.status_msg === constStatus.COMPLETE) {
        clearInterval( startCounting )
        testTimeElapsed = 0
        queueItem.status = constStatus.COMPLETE
        this._updateTestingQueueItem(queueItem)
      }
      else this._initCheckTestStatus(queueItem)
    }    
  }

  _runTestingQueue() {
    this.setState({
      runningQueue: setInterval(() => {


        let running = this.state.branches.filter(b => ACTIVE_TESTING_STATUSES.includes(b.status))
        running.forEach(item => {
          if (item.runningProcess) return
          // Advance items based on status
          else if (
            item.status === constStatus.INIT ||
            item.status === constStatus.FETCHING ||
            item.status === constStatus.UPLOADING
          ) {
            item.status = constStatus.FETCHING
            item.runningProcess = true
            this._updateTestingQueueItem(item)
            this._fetchGithubRepo(item)
          }
          else if (item.status === constStatus.UPLOADED) this._runTests(item)
          else {
            this._initCheckTestStatus(item)
          }
        })


      }, MILISECOND_INTERVAL_FOR_STATUS_POLING)
    })
  }

  _stopTestingQueue() {
    clearInterval(this.state.runningQueue)
    clearTimeout( statusCheck )
    clearInterval( startCounting )
    this.setState({ runningQueue: null })
  }

  _startTestingQueue() {
    const { branches } = this.state
    let queue = branches.filter(b => b.status === constStatus.QUEUED)
    let running = branches.filter(b => ACTIVE_TESTING_STATUSES.includes(b.status))
    if (queue.length && !running.length) this._startTestOnQueueItem(queue[0])
    this._runTestingQueue()
  }

  async _queueSelectedFiles() {
    let markQueued = this.state.branches.filter(b => b.checked && !ACTIVE_TESTING_STATUSES.includes(b.status))
    const branches = this.state.branches.map(b => {
      const shouldQueue = markQueued.find(m => {
        return m.repoPath === b.repoPath
      })
      if (shouldQueue) return {...b, status: constStatus.QUEUED}
      else return b
    })
    await this._persistTestingQueue(branches)
    this._startTestingQueue()
  }

  _fetchGithubRepo = async queueItem => {
    const { owner, repo, selectedBranch: branchName } = queueItem
    const token = getCookie(tokenCookieName)
    if (!token) alert('GitHub token not found.')
    else {
      githubApi.setToken(token)
      const { tree } = await this._getTree(
        owner,
        repo,
        branchName,
      )
      if (tree && tree.tree) this._uploadGithubRepo(queueItem, tree)    
    }
  }

  _fetchProductCode = async (projectName) => {
    const { data = {} } = await api.getProject(projectName).catch(() => ({}))
    const { response: projectOnServer = {} } = data
    const { code: codeOnServer = [] } = projectOnServer
    return codeOnServer
  }

  _uploadGithubRepo = async (queueItem, tree) => {
    const { owner, repo, selectedBranch } = queueItem
    const projectName = `${owner}_${repo}_${selectedBranch}`
    const codeOnServer = await this._fetchProductCode(projectName)
    const thisUploadQueue = currentUploadQueue = new Date().getTime()

    let uploadErrors = [],
      uploaded = [],
      toUpload = tree.tree.filter(t => t.type === 'blob'),
      retryFailedUploadsAttempt = 0,
      interval
    const treeSize = toUpload.length

    queueItem.fileCount = treeSize
    queueItem.status = 'UPLOADING'
    this._updateTestingQueueItem(queueItem)

    const checkUploadsComplete = () => {
      if (uploaded.length + uploadErrors.length === treeSize) { 
        if (!uploadErrors.length) {
          clearInterval(interval)
          queueItem.status = constStatus.UPLOADED
          queueItem.runningProcess = null
          this._updateTestingQueueItem(queueItem)
        }
        else if (retryFailedUploadsAttempt < 3) {
          retryFailedUploadsAttempt++
          console.log('Retry attempt #' + retryFailedUploadsAttempt)
          successfulUploads = successfulUploads - uploadErrors.length
          toUpload = uploadErrors
          uploadErrors = []
        }
        else {
          clearInterval(interval)
          this.setState({ fetchCustomRepoErrors: uploadErrors })
        }
      }
      // this.setState({
      //   ghUploaded: uploaded.length,
      // })
    }
    const fetchBlobError = (err, file) => {
      console.error(err)
      console.log(`Failed: ${file.sha}`, file.path)
      return null
    }
    const apiError = (err, file) => {
      err = err || new Error(`Failed to push file: ${file.path}`)
      console.error(err)
      uploadErrors.push(file)
      checkUploadsComplete()
    }
    const sendFile = async (file) => {
      concurrentUploads++
      const blob = await githubApi.getBlob(owner, repo, file.sha)
        .catch(() => null)
      if (!blob) { fetchBlobError(new Error('Failed to fetch blob.'), file) }
      else {
        // check the sha256 hash to skip any synchronized files
        const code = 'data:application/octet-stream;base64,' + blob['content']
        let binStringToHash = sha256(atob(blob['content']))
        const synchronized = Boolean(codeOnServer.find(f => f.sha256 === binStringToHash))

        const putCodeCallback = (apiResponse, file) => {
          successfulUploads++
          concurrentUploads--
          if (!apiResponse) apiError(null, file)
          else {
            uploaded.push(file)
            checkUploadsComplete()
          }
        }

        if (synchronized) {
          // console.log(`\tSkipping synchronized file ${file.path}`)
          putCodeCallback(true, file)
        }
        else {
          // console.log(`\tUploading file ${file.path}`)
          api.putCode({
            name: file.path,
            code,
            project: encodeURIComponent(projectName),
          })
          .then(res => {putCodeCallback(res, file)})
          .catch(err => apiError(err, file))
        }
      }
    }

    // send the files
    const sendFiles = () => {
      if (
        currentUploadQueue === thisUploadQueue
        && concurrentUploads <= maxConcurrentUploads
      ) {
        if (!toUpload.length) checkUploadsComplete()
        else {
          const file = toUpload[0]
          toUpload = toUpload.filter(f => f !== file)
          // console.log(`upload ${file.path} after pausing ${millisecondTimeout} milliseconds with ${concurrentUploads} files in queue and ${successfulUploads} successful uploads`)
          sendFile(file)
        }
      }
    }
    interval = setInterval(
      sendFiles,
      millisecondTimeout
    )
  }

  /** @dev Components ******************************/
  ApiFunctions = () => {
    const { automateAuth } = this.state
    if (automateAuth) {
      this._runApiFunctions()
    }
    return null//<this.ApiButtons />
  }
  
  ApiButtons = () => {
    const { automateAuth } = this.state
    const show = { display: !automateAuth ? 'inline-block' : 'none' }
    
    return <div style={{padding: '21px 0', textAlign: 'left'}}>

      <this.FetchAccessToken style={show} />

      <this.FetchUserProfile style={show} />

      <this.FetchUserRepos />

    </div>
  }

  TableExamplePositiveNegative = ({
    branches,
    disableQueueButtons,
    runningQueue
  }) => {
    const { token } = this.state
    if (!token || !branches || !branches.length) return null
    else return <div>
      <h2 style={{width: 'auto'}}>
        Static Analysis Test Queue
        <span style={{fontSize: '60%', marginLeft: 18}}>
          off
          &nbsp;<Radio toggle style={{verticalAlign: 'middle'}}
            checked={runningQueue != null}
            onClick={() => {
              if (this.state.runningQueue) this._stopTestingQueue()
              else this._startTestingQueue()
            }} />&nbsp;
          on
        </span>
      </h2>
      <Table celled>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell style={{textAlign: 'center'}}><input type="checkbox" style={{zoom: 1.8, verticalAlign: 'middle'}}
              checked={
                !branches.find(b => !b.checked)
              }
              onChange={e => {
                branches = branches.map(b => {
                  // console.log(b.checked, e.target.checked)
                  return ({...b, checked: e.target.checked})
                })
                const filteredBranches = branches.filter(
                  b => b.checked && branches.length
                )
                disableQueueButtons = Boolean(!filteredBranches.length)
                this.setState({ disableQueueButtons })
                this._persistTestingQueue(branches)
            }} /></Table.HeaderCell>
            <Table.HeaderCell>Repo Path</Table.HeaderCell>
            <Table.HeaderCell>Branch</Table.HeaderCell>
            <Table.HeaderCell>File Count</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {
            branches.map(r => {
              const rowKey = `row_${r.owner}_${r.path}`
              return <Table.Row key={rowKey} positive={r.jobStatus === 'COMPLETE'}>
                <Table.Cell style={{textAlign: 'center'}}><input type="checkbox" style={{zoom: 1.8, verticalAlign: 'middle'}}
                  checked={r.checked}
                  onChange={e => {
                    let row = branches.find(_r => _r.repoPath === r.repoPath)
                    row.checked = !row.checked
                    const filteredBranches = branches.filter(
                      b => b.checked && branches.length
                    )
                    disableQueueButtons = Boolean(!filteredBranches.length)
                    this.setState({ disableQueueButtons })
                    this._persistTestingQueue(branches)
                  }} /></Table.Cell>
                <Table.Cell>{r.repoPath}</Table.Cell>
                <Table.Cell>
                  <Select options={r.branches.map(b => ({ key: b, value: b, text: b }))}
                    defaultValue={r.selectedBranch}
                    onChange={e => {
                      let row = branches.find(_r => _r.repoPath === r.repoPath)
                      row.selectedBranch = e.target.innerHTML
                      this._persistTestingQueue(branches)
                    }}
                    placeholder={'Select a branch'}>
                  
                  </Select>
                </Table.Cell>
                <Table.Cell>{r.fileCount || '?'}</Table.Cell>
                <Table.Cell>
                  <Loader style={{
                    display: (r.status && r.status !== constStatus.QUEUED && this.state.runningQueue) ? 'inline-block' : 'none',
                    marginRight: 9
                  }} inline size={'small'} />
                  {/* {r.status && r.status !== 'QUEUED' ?  : null} */}
                  {r.status}
                </Table.Cell>
              </Table.Row>
            })
          }
        </Table.Body>
      </Table>
      <StlButton disabled={disableQueueButtons}
        onClick={() => { this._queueSelectedFiles() }}>Run Tests on Selected Repos</StlButton>
      &nbsp;
      <StlButton disabled={disableQueueButtons} default semantic
        onClick={() => { this._removeRowsFromQueue() }}>Remove Selected Repos</StlButton>
    </div>
  }

  FetchAccessToken = (props) => <StlButton primary semantic disabled={Boolean(this.state.token)}
    style={props.style}
    onClick={async () => {
      this.setState({ working: true })
      await this.fetchToken(true)
      this.setState({ working: false }) 
    }}>Fetch Access Token &laquo;</StlButton>

  FetchUserProfile = (props) => <StlButton primary semantic
    disabled={Boolean(!this.state.token || this.state.user)}
    style={props.style}
    onClick={ async () => {
      this.setState({ working: true })
      await this.fetchUser(true)
      this.setState({ working: false })
    }}>Fetch User Profile &raquo;</StlButton>

  FetchUserRepos = () => <StlButton default
    style={{
      display: Boolean(!this.state.user || !this.state.branches) ?
      'none' : 'block' }}
    onClick={ async () => {
      this.setState({ branches: [] })
    }}>Add Repositories</StlButton>

  RepoList = () => {
    const {
      branches = [],
      fetchCustomRepoError = '',
      fetchCustomRepoErrors = [],
      repoListInputDisabled,
      showRepoInput,
      token
    } = this.state
    const parsedCookieValue = (getCookie(FETCH_REPO_LIST_COOKIENAME).length ? getCookie(FETCH_REPO_LIST_COOKIENAME).split(',').join('\n') : null)
    const specifyRepo = <React.Fragment>
      <h3>Test Multiple Repositories</h3>
      <p>Add 1 <code>owner/repo</code> combo per line. <i>(ex: <code>faster-than-light/ftl</code>)</i></p>
      <Form>
        <TextArea id='repo_list' type="text"
          ref={r => {
            if (r) r.value = parsedCookieValue
            this.repoListTextInput = r
          }}
          defaultValue={parsedCookieValue}
          onChange={ev => {
            setCookie(FETCH_REPO_LIST_COOKIENAME, ev.target.value.split('\n').join(','))
            this.repoListTextInput.value = ev.target.value
          }}
          disabled={repoListInputDisabled}
          placeholder=":owner/:repo&#xa;:owner/:repo&#xa;:owner/:repo"
          style={{ height: 99 }} />
        <p>
          <StlButton onClick={this._fetchRepoList}
            disabled={repoListInputDisabled}>fetch repos</StlButton>
        </p>
      </Form>
      <div className="error">
        {fetchCustomRepoErrors.map(e => <div>{e}</div>)}
        <pre>{fetchCustomRepoError}</pre>
      </div>
    </React.Fragment>

    if (token && (showRepoInput || !branches.length || fetchCustomRepoErrors.length)) {
      const repos = this.state.repos ? this.state.repos.map((repo, k) => <Table.Row key={k}>
        <Table.Cell><a onClick={() => this._getBranches(repo)}>
          {repo}
        </a></Table.Cell>
      </Table.Row>) : null
      return <div className="repo-list">
        {specifyRepo}
        {repos}
      </div>
    }
    else if (token) return <StlButton link 
      style={{float: 'right'}}
      onClick={() => {this.setState({
        showRepoInput: true,
        fetchCustomRepoErrors: [],
      })}}>
      <Icon name='add' />
      Add Repositories
    </StlButton>
    else return null
  }

  sortOptionChange = e => {
    const sortReposBy = e.target.value
    if (sortReposBy != this.state.sortReposBy) this.setState({
      sortReposBy,
      repos: null,
    })
  }

  sortDirectionChange = e => {
    const sortReposDirection = e.target.value
    if (sortReposDirection != this.state.sortReposDirection) this.setState({
      sortReposDirection,
      repos: null,
    })
  }

  BranchList = () => {
    if (this.state.branches && !this.state.tree) {
      const branches = this.state.branches.length ? this.state.branches.map((branch, k) => 
      <Table.Row key={k}>
        <Table.Cell>
          <a onClick={() => { this.getTree(branch) }}>{branch}</a>
        </Table.Cell>
      </Table.Row>) : <Table.Row key={0}>
        <Table.Cell>Not found.</Table.Cell>
      </Table.Row>
      return <div className="repo-list">
        <h3>Choose a branch of <code>{this.state.currentRepo}</code></h3>
        <Table celled striped className={'data-table'}>
          <Table.Body>
            { branches }
          </Table.Body>
        </Table>
      </div>
    }
    else return null
  }

  getTree = async branchName => {
    window.scrollTo({ top: 0 })
    this.setState({ working: true })
    const [ owner, repo ] = this.state.currentRepo.split('/')
    const data = await this._getTree(
      owner,
      repo,
      branchName,
    )
    this.setState({ ...data, working: false })
  }

  RepoContents = () => {
    const { branchName, currentRepo, showFiles, tree } = this.state
    let newProjectPath = `${this.state.currentRepo}/${this.state.branchName}`
    newProjectPath = '/project/' + newProjectPath.replace(/\//g,'%2F')
    if (tree) newProjectPath += '?gh=' + tree.sha
    if (tree) {
      const contents = tree.tree && tree.tree.length ? tree.tree.map((t, k) => 
      <Table.Row key={k}>
        <Table.Cell>
          { t.path }
        </Table.Cell>
      </Table.Row>) : <Table.Row key={0}>
        <Table.Cell>Not found.</Table.Cell>
      </Table.Row>
      return <div className="repo-list">
        <h3 style={{ padding: 0 }}>GitHub Repo: <code>{currentRepo}</code></h3>
        <h3 style={{ padding: 0, margin: 0 }}>Branch: <code>{branchName}</code></h3>
        <p style={{ marginTop: 15 }}>GitHub Tree SHA: <code>{tree.sha}</code></p>
        <p>
          {tree.tree.filter(t => t.type === 'blob').length} total files &nbsp;
          <a onClick={() => { this.setState({ showFiles: !showFiles })}}>
            show / hide
          </a>
        </p>
        <Table celled striped className={'data-table'}
          style={{ display: !showFiles ? 'none' : 'table' }}>
          <Table.Body>
            { contents }
          </Table.Body>
        </Table>
        <Link to={newProjectPath}>
          <StlButton onClick={this.testRepo}>Test This GitHub Repo</StlButton>
        </Link>
      </div>
    }
    else return null
  }

  /** @dev Network Data ******************************/
  fetchToken = async alertError => {
    let token
    const code = queryString.parse(document.location.search)['code']
    try {
      token = await githubApi.getAccessToken(code)
    } catch(e) { console.error(e) }
    if (!token) {
      if (alertError) alert('There was a problem fetching a token. Please try again.')
      this._resetState()
    }
    else {
      if (token.length) {
        setCookie(tokenCookieName, token)
        this.setState({ token })
      }
    }
    return token
  }

  fetchRepos = async alertError => {
    let repos
    try {
      repos = await githubApi.getRepos(
        this.state.sortReposBy,
        this.state.sortReposDirection
      )
    }
    catch(e) { console.error(e) }
    if (!repos && alertError) alert("There was a problem fetching your Repository List. Please start over and try again.")
    else this.setState({ repos, contents: null })
    return repos
  }

  fetchBranches = async ownerRepoArray => {
    const [ owner, repo ] = ownerRepoArray
    let branches = await githubApi.getBranches(owner, repo)
    return branches.map(b => b.name)
  }

  fetchUser = async alertError => {
    let user
    try { user = await githubApi.getAuthenticated() }
    catch(e) { console.error(e) }
    if (!user) {
      if (alertError) alert("There was a problem fetching your Profile. Please start over and try again.")
      this._resetState()
    }
    else this.setState({ user })
    return user
  }

  fetchCustomRepo = async () => {
    this.setState({ fetchCustomRepoError: null })
    const badPatternError = new Error('The :owner/:repo pattern is not valid.')
    const currentRepo = document.getElementById("custom_repo").value
    const throwError = err => {
      err = err || new Error(`There was an error fetching branches for \`${currentRepo}\``)
      console.error(err)
      this.setState({
        fetchCustomRepoError: err.message
      })
    }
    if (!currentRepo) return throwError(new Error('No :owner/:repo pattern was entered.'))

    if ((currentRepo.match(/\//g) || []).length !== 1) return throwError(badPatternError)
    const [ owner, repo ] = currentRepo.split('/')
    if (!owner || !repo) return throwError(badPatternError)
    
    let branches = await githubApi.getBranches(owner, repo).catch(e => { return throwError(e) })
    if (!branches) return throwError(new Error(`No branches were found for \`${currentRepo}\``))
    
    branches = branches.map(b => b.name)
    this.setState({
      branches,
      currentRepo,
      working: false
    })
  }

  /** @dev Render this component ******************************/
  render() {
    const {
      // automateAuth,
      branches = [],
      code,
      disableQueueButtons,
      redirect,
      // repos,
      runningQueue,
      token,
      // user,
      working,
    } = this.state
    const onSuccess = response => {
      const { code } = response
      this.setState({ code, working: false })
    }
    const onFailure = response => console.error(response)

    if (redirect) return <Redirect to={redirect} />
    else return <div id="github">
      <Menu />
      <FtlLoader show={working} text="working" />
      <div id="cqc">
        {/* <div className="white-block" style={{ textAlign: 'center', marginTop: 111, padding: 18 }}> */}
        <div style={{ textAlign: 'center', marginTop: 111, padding: 18 }}>
          <div className="block-content">

            {/* {
              !code && !token ? null :
                <Link to={'/cqc'}
                  onClick={this._resetState}
                  style={{float: 'left'}}>&laquo; log out of GitHub</Link>
            } */}

            {
              token ? null : <div>
                <h2>GitHub Code Certification</h2>

                <p className="oauth-images">
                  <img src={bugcatcherShield} alt="BugCatcher" />
                  <div className="center-check">
                    <div className="icon-box">
                      <Icon name="chevron circle right" size="big" style={{ color: 'green' }} />
                    </div>
                  </div>
                  <img src={githubLogo} alt="GitHub" />
                </p>
              </div>
            }

            {
              code || token ? <this.ApiFunctions /> : <React.Fragment>
                <p><br />
                  <a href={`https://github.com/login/oauth/authorize?client_id=${github.clientId}&type=user_agent&scope=user,repo&redirect_uri=${appUrl}/gh_auth?cqc=1`}>
                    <StlButton className="big"
                    onClick={
                      () => { this.setState({ working: true }) }
                    }>Connect to GitHub</StlButton>
                  </a>
                  {/* <GitHubLogin className="big btn"
                    clientId={github.clientId}
                    redirectUri=''
                    scope="user repo"
                    buttonText="Option 2&raquo;In New Tab"
                    onSuccess={onSuccess}
                    onFailure={onFailure}/> */}
                </p>

                {/* <label htmlFor="automate" style={{ zoom: 1.2, display: 'none' }} className="well">
                  <input id="automate" type="checkbox" onChange={this._toggleAutomateOption}
                    checked={this.state.automateAuth} />
                  &nbsp;Automate all steps of the authentication process
                </label> */}

                {/* <ul style={{textAlign: 'left', margin: 18}}>
                  <li>Option 1 is redirecting you straight to Github in this window.</li>
                  <li>Option 2 is using a React JS component library to use a new window/tab to log in.</li>
                </ul>
                <p>Both options result in a temporary <code>code</code> being returned from GitHub. This code can be used with the GitHub API for 10 minutes to retrieve an <code>Access Token</code>. The access token can then be used to interact with GitHub on behalf of the user for 1 hour or until the user logs out of GitHub.</p> */}
              </React.Fragment>
            }

            <div style={{textAlign: 'left'}}>

              <this.RepoList />

              <this.TableExamplePositiveNegative branches={branches}
                disableQueueButtons={disableQueueButtons}
                runningQueue={runningQueue} />

              {/* <this.BranchList /> */}

              {/* <this.RepoContents /> */}

            </div>

          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
