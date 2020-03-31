import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import queryString from 'query-string'
import {
  Dropdown,
  Form,
  Icon,
  Label,
  Loader,
  Radio,
  Select,
  Table,
  TextArea,
  // DropdownItem
} from 'semantic-ui-react'
import { sha256 } from 'js-sha256'

// components
import FtlLoader from '../../components/Loader'
import Menu from '../../components/Menu'

// helpers
import api from '../../helpers/api'
import { appUrl, github } from '../../config'
import { getCookie, setCookie } from '../../helpers/cookies'
import githubApi from '../../helpers/githubApi'
import LocalStorage from '../../helpers/LocalStorage'

// images & styles
import bugcatcherShield from '../../assets/images/bugcatcher-shield-square.png'
import githubLogo from '../../assets/images/github-logo.png'
import StlButton from '../../components/StlButton'
import '../../assets/css/CQC.css'
import cqcApi from '../../helpers/cqcApi'

/** Constants */
const uploadsPerSecond = 0 // 0 = unlimited
const resetData = {
  checked: false,
  fileCount: null,
  filesUploaded: null,
  percentComplete: null,
  pullRequest: null,
  published: null,
  resultsMatrix: null,
  runningProcess: null,
  status: null,
  testId: null,
}
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
  retryAttemptsAllowed = 300,
  retryIntervalMilliseconds = 9000
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
const MILISECOND_INTERVAL_FOR_STATUS_POLING = 6000
const MILISECOND_INTERVAL_FOR_SERVER_PERSISTENCE = 12000
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
const { tokenCookieName } = github

/** Global Variables */
let retryAttempts = 0,
  lastPercentComplete = 0,
  currentUploadQueue,
  lastPersistedBranches = [],
  persistingToBackend,
  statusCheck,
  startCounting,
  testTimeElapsed = 0,
  successfulUploads = 0,
  concurrentUploads = 0

export default class CQC extends Component {
  /** @dev Constructor and Lifecycle *******************************/
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

    this.ApiFunctions = this.ApiFunctions.bind(this)
    this._persistTestingQueueToServer = this._persistTestingQueueToServer.bind(this)
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

  async componentDidMount() {
    document.addEventListener("keydown", this._fetchRepoKeydownEvent)
    if (this.props.user) {
      const { data: jobs } = await cqcApi.getJobsQueue(this.props.user)
      this._persistTestingQueue(jobs)
      this.setState({ jobsFetchedFromServer: true })
    }
    this._serverPersistOn()
    window.addEventListener("beforeunload", (ev) => 
    {  
        ev.preventDefault()

        let { branches = [] } = this.state
        if (
          branches.find(
            b => !lastPersistedBranches.includes(JSON.stringify(b))
          )
        ) {
          this._persistTestingQueueToServer()
          return ev.returnValue = 'Are you sure you want to close?'
        }
    })
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._fetchRepoKeydownEvent)
    this._stopServices()
  }

  /** @dev Functions *******************************/
  _serverPersistOn() {
    if (this.state.persistToBackendInterval) clearInterval(this.state.persistToBackendInterval)
    this.setState({
      persistToBackendInterval: setInterval(
        this._persistTestingQueueToServer,
        MILISECOND_INTERVAL_FOR_SERVER_PERSISTENCE
      )
    })
  }

  _serverPersistOff() {
    clearInterval(this.state.persistToBackendInterval)
  }

  _startServices() {
    this._startTestingQueue()
    this._serverPersistOn()
  }

  _stopServices() {
    this._stopTestingQueue()
    this._serverPersistOff()
  }

  _clearStatusCheck() {
    clearTimeout( statusCheck )
    statusCheck = null
  }

  _fetchRepoKeydownEvent = event => {
    if (
      event.target["id"] === 'custom_repo' && (
        event.code === 'Enter' || event.keyCode === 13
      )
    ) this.fetchCustomRepo()
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
  
  _appendPrintedErrors = errMsg => {
    const fetchCustomRepoErrors = (this.state.fetchCustomRepoErrors || []).concat(errMsg)
    this.setState({ fetchCustomRepoErrors })
  }
  
  _removePrintedError = errMsg => {
    const fetchCustomRepoErrors = (this.state.fetchCustomRepoErrors || []).filter(
      e => !!e.search(errMsg)
    )
    this.setState({ fetchCustomRepoErrors })
  }

  _ephemeralPrintedError(errMsg, milliseconds) {
    milliseconds = milliseconds || 6000
    this._appendPrintedErrors(errMsg)
    setTimeout(
      () => {
        this._removePrintedError(errMsg)
      }, milliseconds
    )
  }

  _fetchRepoList = async () => {
    this._stopServices()
    let { branches = [] } = this.state
    // let fetchCustomRepoErrors = new Array()
    this.setState({ fetchCustomRepoErrors: [], showRepoInput: false })
    const reposText = this.repoListTextInput.value || ''
    if (!reposText) {
      this._appendPrintedErrors('Please enter at least one owner/repo combo.')
      return
    }
    let repos = new Array()
    const validateRepoText = r => {
      if (!r.length) return
      const [ owner, repo ] = r.split('/')
      if (!owner || !repo) this._appendPrintedErrors(`Check format of "${r}"`)
      else repos.push([owner, repo])
    }
    if (reposText.includes('\n')) {
      reposText.split('\n').forEach(r => { validateRepoText(r.trim()) })
    }
    else validateRepoText(reposText)
    if (!repos.length) this._appendPrintedErrors('No repos parsed from input.')
    else {
      if (repos.length && !this.state.fetchCustomRepoErrors || !this.state.fetchCustomRepoErrors.length) {
        this.setState({ repoListInputDisabled: true })
        this._appendPrintedErrors(
          `Fetching branches of ${repos.length} repos...`
        )

        /** @todo Fetch GitHub branches for each repo */
        let fetchCustomRepoRows = new Array()
        for(let i = 0;i < repos.length;i++) {
          const branchesForRepo = await this.fetchBranches(repos[i])
            .catch(() => null)
          if (!Array.isArray(branchesForRepo)) {
            this._ephemeralPrintedError(`${repos[i][0]}/${repos[i][1]} was not found.`)
          }
          else {
            fetchCustomRepoRows.push([repos[i],branchesForRepo])
          }
        }

        this._removePrintedError('Fetching branches of')

        fetchCustomRepoRows.forEach(r => {
          const owner = r[0][0]
          const repo = r[0][1]
          const repoPath = `${owner}/${repo}`
          const selectedBranch = existingRepo ? existingRepo.selectedBranch : 'master'
          const projectName = this._projectName({
            owner,
            repo,
            selectedBranch
          })
          let existingRepo = branches.find(b => b.projectName === projectName)
          let repoBranches = r[1]
          const treeSha = repoBranches.find(b => b.name === selectedBranch)['commit']['sha']
          let branch = {
            ...existingRepo,
            branches: repoBranches,
            checked: existingRepo && existingRepo.checked,
            owner,
            projectName,
            repo,
            repoPath,
            selectedBranch,
            status: existingRepo ? existingRepo.status : null,
            treeSha,
          }
          branch.projectName = this._projectName(branch)

          if (existingRepo) existingRepo = { ...branch }
          else branches.push(branch)
        })

        this.setState({
          repoListInputDisabled: null
        })

        function compare( a, b ) {
          if ( a.projectName < b.projectName ) return -1
          else if ( a.projectName > b.projectName ) return 1
          else return 0
        }
        branches.sort( compare )
        this._persistTestingQueue(branches)
      }
    }
    this._startServices()
  }

  async _deleteProject(r, print) {
    if (print) this._ephemeralPrintedError(`Deleting ${r.projectName}...`)
    await api.deleteProject(r.projectName).catch(() => null)
  }

  _resetRowsInQueue() {
    let { branches = [] } = this.state
    
    let selected = branches.filter( b => b.checked )

    if (!window.confirm(`Reset ${selected.length} projects and do not "queue" them yet?`)) return

    if (selected.find(r => r.runningProcess)) this._clearStatusCheck()

    // delete projects from backend
    for (let i = 0; i < selected.length; i++) {
      setTimeout(
        () => { this._deleteProject(selected[i]) },
        i*300
      )
    }

    // reset data
    branches = branches.map(b => {
      if (!b.checked) return b
      else return ({
        ...b,
        ...resetData,
        checked: true,
      })
    })

    this._persistTestingQueue(branches)
  }

  _removeRowsFromQueue() {
    const removedRows = this.state.branches.filter(b => b.checked)
    if (!window.confirm(`Really remove ${removedRows.length} project from queue?`)) return

    if (removedRows.find(r => r.runningProcess)) this._clearStatusCheck()

    for (let i = 0; i < removedRows.length; i++) {
      setTimeout(
        () => { this._deleteProject(removedRows[i], true) },
        i*300
      )
    }
     
    this._deleteTestingQueueItemsFromServer(removedRows)
  }

  _updateTestingQueueItem(updatedItem) {
    let { branches } = this.state
    let itemToUpdate = branches.find(
      b => b.projectName === updatedItem.projectName
    )
    itemToUpdate = { ...updatedItem }
    this._persistTestingQueue(branches)
  }

  _deleteTestingQueueItems(deletedItems) {
    let { branches } = this.state
    branches = branches.filter(
      b => !deletedItems.includes(b)
    )
    this._persistTestingQueue(branches)
  }

  async _deleteTestingQueueItemsFromServer(jobs) {
    const res = await cqcApi.deleteJobsQueueItems({
      jobs,
      user: this.props.user
    })
    if (res) {
      const branches = this.state.branches.filter(
        b => !jobs.includes(b)
      )
      this._persistTestingQueue(branches)
    }
  }

  async _persistTestingQueueToServer() {
    if (!persistingToBackend) {
      persistingToBackend = true

      let { branches = [] } = this.state
      /** @todo: Only update changed rows */
      /** @todo: Delete removed rows from server */
  
      const discrepency = branches.find(
        b => !lastPersistedBranches.includes(JSON.stringify(b))
      )
      if (discrepency) {
        const newBranches = await cqcApi.putJobsQueue({
          jobs: branches,
          user: this.props.user
        })
        // find jobs with no ID
        let updateLocalStorage
        branches.forEach(b => {
          if (!b._id) {
            updateLocalStorage = true
            const savedBranch = newBranches.find(n => (
              n.owner === b.owner &&
              n.repo === b.repo &&
              n.selectedBranch === b.selectedBranch
            ))
            if (savedBranch) {
              console.log(`assign _id ${savedBranch._id}`)
              b._id = savedBranch._id
            }
          }
        })
        lastPersistedBranches = branches.map(JSON.stringify)
        if (updateLocalStorage) {
          console.log('persisting branches to local storage')
          this._persistTestingQueue(branches)
        }
      }
      persistingToBackend = false
    }
  }

  async _persistTestingQueue(branches) {
    const filteredBranches = branches.length ? branches.filter(
      b => b.checked
    ) : []
    const disableQueueButtons = Boolean(!filteredBranches.length)
    this.setState({ branches, disableQueueButtons })
    LocalStorage.BulkTestingQueue.setTestingQueue(branches)
  }

  async _startTestOnQueueItem(queueItem) {
    this._persistTestingQueue(this.state.branches.map(b => {
      if (b.projectName === queueItem.projectName) return ({...b, status: 'INIT'})
      else return b
    }))
  }

  _checkTestStatus(queueItem) {
    const { testId: stlid } = queueItem
    let { reconnecting } = this.state
    if (!stlid) return []
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
        this._clearStatusCheck()
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
        queueItem.percentComplete = response.percent_complete
        this._updateTestingQueueItem(queueItem)
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
          this._clearStatusCheck()
          statusCheck = setTimeout(
            async () => { resolve(await this._checkTestStatus(queueItem)) },
            retryIntervalMilliseconds
          )
        }
        else reject()
      }
      else reject()
    })
  }

  _projectName(queueItem) {
    let { owner, repo, selectedBranch } = queueItem
    if (selectedBranch) selectedBranch = selectedBranch.replace(/refs\/heads\//g, '')
    const projectName = [`${owner}/${repo}`, selectedBranch].join('/').replace(/\//g, '_')
    return projectName
  }

  _runTests = async (queueItem) => {
    queueItem.runningProcess = true
    this._updateTestingQueueItem(queueItem)

    const projectName = this._projectName(queueItem)

    this._clearStatusCheck()
    clearInterval( startCounting )
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
    this._clearStatusCheck()

    if (!queueItem.runningProcess) {
      queueItem.runningProcess = true
      this._updateTestingQueueItem(queueItem)
    }

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

        // fetch results
        const results = await this.fetchTestResults(queueItem)//.catch(() => null)
        if (results) {
          const { data } = results
          let resultsMatrix = {
            low: 0,
            medium: 0,
            high: 0,
          }
          data.test_run_result.forEach(hit => {
            const test_suite_test = hit['test_suite_test']
            const ftl_severity = test_suite_test['ftl_severity']
            resultsMatrix[ftl_severity]++
          })
          queueItem.resultsMatrix = resultsMatrix
        }

        queueItem.status = constStatus.COMPLETE
        queueItem.runningProcess = null
        this._updateTestingQueueItem(queueItem)
        this._startServices()
      }
      else this._initCheckTestStatus(queueItem)
    }    
  }

  _runTestingQueue() {
    this.setState({
      runningQueue: setInterval(() => {

        let running = this.state.branches.filter(b => ACTIVE_TESTING_STATUSES.includes(b.status))
        if (running.length) running.forEach(item => {
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
          else if (item.status === constStatus.UPLOADED || !item.testId) this._runTests(item)
          else {
            if (item.testId) this._initCheckTestStatus(item)
            else console.log(`item status: ${item.status}, test id: ${item.testId}`)
          }
        })
        else {
          // No jobs are running. Let's look for queued jobs
          let queued = this.state.branches.find(b => b.status === constStatus.QUEUED)
          if (queued) {
            queued.status = constStatus.INIT
            queued.runningProcess = true
            this._updateTestingQueueItem(queued)
          }
        }


      }, MILISECOND_INTERVAL_FOR_STATUS_POLING)
    })
  }

  _stopTestingQueue() {
    clearInterval(this.state.runningQueue)
    this._clearStatusCheck()
    clearInterval( startCounting )
    this.setState({ runningQueue: null })
    const branches = (this.state.branches || []).map(b => ({
      ...b,
      runningProcess: null,
    }))
    this._persistTestingQueue(branches)
  }

  _startTestingQueue() {
    this._stopTestingQueue()
    const { branches } = this.state
    let queue = branches.filter(b => b.status === constStatus.QUEUED)
    let running = branches.filter(b => ACTIVE_TESTING_STATUSES.includes(b.status))
    if (queue.length && !running.length) this._startTestOnQueueItem(queue[0])
    this._runTestingQueue()
  }

  async _queueSelectedFiles() {
    let markQueued = this.state.branches.filter(b => b.checked && !ACTIVE_TESTING_STATUSES.includes(b.status))
    const branches = this.state.branches.map(b => {
      let shouldQueue = markQueued.find(m => {
        return m.projectName === b.projectName
      })
      if (shouldQueue && b.status === constStatus.COMPLETE)
        if (!window.confirm(`${b.projectName} is COMPLETE. Queue it again for another test?`))
          shouldQueue = false
      if (shouldQueue) return {
        ...b,
        ...resetData,
        status: constStatus.QUEUED,
      }
      else return b
    })
    await this._persistTestingQueue(branches)
    this._startServices()
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
    const { owner, repo } = queueItem
    const projectName = this._projectName(queueItem)
    const codeOnServer = await this._fetchProductCode(projectName)
    const thisUploadQueue = currentUploadQueue = new Date().getTime()

    let uploadErrors = [],
      uploaded = [],
      toUpload = tree.tree.filter(t => t.type === 'blob'),
      retryFailedUploadsAttempt = 0,
      interval
    const treeSize = toUpload.length

    queueItem.filesUploaded = 0
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
      queueItem = !queueItem ? null : this.state.branches.find(b => {
        return b.owner === queueItem.owner &&
          b.repo === queueItem.repo &&
          b.selectedBranch === queueItem.selectedBranch
      })
      if (this.state.runningQueue && queueItem && queueItem.status === constStatus.UPLOADING) {
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
              queueItem.filesUploaded = uploaded.length
              this._updateTestingQueueItem(queueItem)
              checkUploadsComplete()
            }
          }
  
          if (synchronized) {
            console.log(`\tSkipping synchronized file ${file.path}`)
            putCodeCallback(true, file)
          }
          else {
            console.log(`\tUploading file ${file.path}`)
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

  ResultsBreakdown = (resultsMatrix = {}) => (<span>
    <span style={{ color: resultsMatrix.high ? '#ff4747' : 'inherit' }}>{resultsMatrix.high} High</span>&nbsp;&nbsp;
    <span style={{ color: resultsMatrix.medium ? '#dcab27' : 'inherit' }}>{resultsMatrix.medium} Medium</span>&nbsp;&nbsp;
    <span style={{ color: resultsMatrix.low ? '#29ab55' : 'inherit' }}>{resultsMatrix.low} Low</span>
  </span>)

  TableExamplePositiveNegative = ({
    branches,
    disableQueueButtons,
    runningQueue
  }) => {
    const { token, tree = {} } = this.state
    if (!token || !branches || !branches.length) return null
    else {
      // const DropdownActionsMenu = (props) => {
      //   const { disabled } = props
      //   return <Dropdown
      //     text={'more actions'}
      //     icon='chevron down'
      //     floating
      //     labeled
      //     disabled={disabled}
      //     style={{ width: 180 }}
      //     button
      //     className='icon'
      //   >
      //     <Dropdown.Menu>
      //       <Dropdown.Item icon='repeat' text='Reset Items'
      //         onClick={() => { this._resetRowsInQueue() }}></Dropdown.Item>
      //       <Dropdown.Item icon='delete' text='Remove Items'
      //         onClick={() => { this._removeRowsFromQueue() }}></Dropdown.Item>
      //     </Dropdown.Menu>
      //   </Dropdown>
      // }

      const ToggleQueueRunning = (props) => {
        const { style } = props
        return <span style={style}>
          off
          &nbsp;<Radio toggle style={{verticalAlign: 'middle'}}
            checked={runningQueue != null}
            onClick={() => {
              if (this.state.runningQueue) this._stopTestingQueue()
              else this._startTestingQueue()
            }} />&nbsp;
          on
        </span>
      }
      return <div>
        <h2 style={{width: 'auto'}}>
          <span style={{ float: 'right', fontSize: '60%' }}>
            Running: <h2 style={{
              display: 'inline-block',
              width: 'auto',
              margin: 0,
              padding: 0
            }}><ToggleQueueRunning style={{fontSize: '60%', marginLeft: 9, marginRight: 18, fontWeight: 'normal'}} /></h2>
          </span>
          Static Analysis Test Queue
        </h2>
        <Table size={'small'} celled>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell style={{textAlign: 'center'}}><input type="checkbox" style={{zoom: 2.1, verticalAlign: 'middle'}}
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
              <Table.HeaderCell>Properties</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              branches.map(row => {
                let {
                  branches: repoBranches,
                  checked,
                  fileCount,
                  filesUploaded,
                  treeSha,
                  owner,
                  percentComplete,
                  pullRequest,
                  projectName,
                  published,
                  repo,
                  repoPath,
                  resultsMatrix,
                  status,
                  selectedBranch,
                  testId
                } = row
                const rowKey = `row_${projectName}`
                const resultsBreakdown = resultsMatrix ? this.ResultsBreakdown(resultsMatrix) : 'unavailable'
                const ActionsDropdown = () => (
                  <Dropdown
                    text={status}
                    icon='chevron down'
                    floating
                    labeled
                    style={{ width: 180 }}
                    button
                    className='icon'
                  >
                    <Dropdown.Menu>
                      <Dropdown.Header content={<span>
                        <strong>Test Results:</strong><br />
                        {resultsBreakdown}
                      </span>} />
                      <Dropdown.Divider />
                      <Dropdown.Item><Link to={`/results/${testId}`} target="_blank"><Icon name={'linkify'} /> View Report</Link></Dropdown.Item>
                      <Dropdown.Item disabled={resultsMatrix && resultsMatrix.high}>
                        <Link
                          to={`/publish/${testId}?gh=${treeSha}&owner=${owner}&repo=${repo}&branch=${selectedBranch}`}
                          target="_blank"
                          onClick={() => {
                            row.published = true
                            this._updateTestingQueueItem(row)                            
                          }}>
                          <Icon name={'cloud upload'} /> Publish
                        </Link>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                )
                let testStatus = status
                if (status === constStatus.COMPLETE)
                  testStatus = <ActionsDropdown />
                else if (status === constStatus.RUNNING && percentComplete)
                  testStatus = `${status} ${percentComplete}%`
                else if (status === constStatus.UPLOADING && filesUploaded)
                  testStatus = `${status} ${filesUploaded}/${fileCount}`

                return <Table.Row key={rowKey}
                  positive={status === constStatus.COMPLETE}
                  warning={resultsMatrix && resultsMatrix.medium && !resultsMatrix.high}
                  negative={resultsMatrix && resultsMatrix.high}>
                  <Table.Cell style={{textAlign: 'center'}}><input type="checkbox" style={{zoom: 1.5, verticalAlign: 'middle'}}
                    checked={checked}
                    onChange={() => {
                      let thisRow = branches.find(_r => _r.projectName === projectName)
                      thisRow.checked = !thisRow.checked
                      const filteredBranches = branches.filter(
                        b => b.checked && branches.length
                      )
                      disableQueueButtons = Boolean(!filteredBranches.length)
                      this.setState({ disableQueueButtons })
                      this._persistTestingQueue(branches)
                    }} /></Table.Cell>
                  <Table.Cell>{repoPath}</Table.Cell>
                  <Table.Cell>
                    <Select options={repoBranches.map(b => ({ key: b.name, value: b.name, text: b.name }))}
                      defaultValue={selectedBranch}
                      onChange={e => {
                        // let row = branches.find(_r => _r.projectName === projectName)
                        if (e.target.tagName === 'SPAN') row.selectedBranch = e.target.innerHTML
                        else row.selectedBranch = e.target.childNodes[0].innerHTML
                        row.fileCount = fileCount = null
                        row.projectName = projectName = this._projectName(row)
                        row.published = published = null
                        this._updateTestingQueueItem(row)
                      }}
                      disabled={status}
                      style={{ zoom: 0.81 }}
                      placeholder={'Select a branch'}>
                    
                    </Select>
                  </Table.Cell>
                  <Table.Cell>
                    <Label className={'grey'}
                      title={`${fileCount} files uploaded`}
                      style={{ display: fileCount ? 'inline-block' : 'none' }}>
                      <span onClick={() => {
                        window.open(`/project/${projectName}`)
                      }} style={{
                        cursor: 'pointer',
                      }}>
                        <Icon name="file" />
                        {fileCount}
                      </span>
                    </Label>
                    <Link to={`/results/${testId}?published=1`} target="_blank"
                      style={{
                        display: published ? 'inline-block' : 'none'
                      }}>
                        <Icon inverted
                          circular
                          color='grey'
                          name='globe'
                          title="published" />
                    </Link>
                    <a href={pullRequest || '#'} target="_blank"
                      style={{
                        display: pullRequest ? 'inline-block' : 'none'
                      }}>
                        <Icon inverted
                          circular
                          color='grey'
                          name='code'
                          title="pull request created" />
                    </a>
                  </Table.Cell>
                  <Table.Cell>
                    <Loader style={{
                      display: (status && status !== constStatus.QUEUED && status !== constStatus.COMPLETE && this.state.runningQueue) ? 'inline-block' : 'none',
                      marginRight: 9
                    }} inline size={'small'} />
                    { testStatus }
                  </Table.Cell>
                </Table.Row>
              })
            }
          </Table.Body>
        </Table>
        <StlButton semantic primary disabled={disableQueueButtons}
          onClick={() => { this._queueSelectedFiles() }}>Start Tests on Selected Repos</StlButton>
        &nbsp;
        <StlButton semantic default disabled={disableQueueButtons}
          onClick={() => { this._resetRowsInQueue() }}>Reset Jobs</StlButton>
        &nbsp;
        <StlButton semantic default disabled={disableQueueButtons}
          onClick={() => { this._removeRowsFromQueue() }}>Delete Jobs</StlButton>
        {/* <DropdownActionsMenu disabled={disableQueueButtons} /> */}
        <span style={{ float: 'right', fontWeight: 'bold' }}>
          Running: <span style={{
            display: 'inline-block',
            width: 'auto',
            margin: 0,
            padding: 0
          }}><ToggleQueueRunning style={{ fontWeight: 'normal' }} /></span>
        </span>
        <p><br /></p>
      </div>
    }
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
      jobsFetchedFromServer,
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
          <StlButton onClick={this._fetchRepoList.bind(this)}
            disabled={repoListInputDisabled}>fetch repos</StlButton>
          &nbsp;
          <StlButton default semantic
            onClick={() => { this.setState({
              showRepoInput: false,
            }) }}
            style={{
              display: branches.length ? 'inline-block' : 'none',
            }}
            >cancel</StlButton>
        </p>
        <p>&nbsp;</p>
      </Form>
    </React.Fragment>

    if (!jobsFetchedFromServer) return <FtlLoader show={true} />
    else if (token && (showRepoInput || !branches.length)) {
      return <div className="repo-list">
        {specifyRepo}
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

  fetchBranches = ownerRepoArray => {
    const [ owner, repo ] = ownerRepoArray
    return githubApi.getBranches(owner, repo)
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

  fetchTestResults = queueItem => {
    if (!queueItem || !queueItem.testId) return
    else return api.getTestResult({ stlid: queueItem.testId }).catch(() => null)
  }

  /** @dev Render this component ******************************/
  render() {
    const {
      // automateAuth,
      branches = [],
      code,
      disableQueueButtons,
      fetchCustomRepoError = '',
      fetchCustomRepoErrors = [],
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

              <div className="error">
                {fetchCustomRepoErrors.map(e => <div>{e}</div>)}
                <pre>{fetchCustomRepoError}</pre>
              </div>

            </div>

          </div>
        </div>

        <br />
      </div>
    </div>
  }
}
