/**
 * @title Code
 * @req Allow user to manage Code and run Tests for a Project
 * 
 * @dev UI Steps
 * @step 1 : Show dropzone and file upload button
 * @step 2 : Determine which files need to be uploaded
 * @step 3 : Show "upload" button
 * @step 4 : Uploading files
 * @step 5 : Files uploaded, Show "test" button
 * @step 6 : Setting up project
 * @step 7 : Running tests
 * @step 8 : Results ready
 * @step -1 : Error
 * 
 * @dev API sequence
 * @call 1 : `POST` `code` to `/project/<project_name>`
 * @call 2 : `POST` to `/test_project/<project_name>` (returns a `stlid`)
 * @call 3 : `GET` from `/run_tests/<stlid>` (returns % complete & status)
 * @call 4 : `GET` from `/test_result/<stlid>` (when status="COMPUTING_PDF" or status="COMPLETE")
 */

import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import { Icon, Progress, Tab, Table, Segment, Select } from 'semantic-ui-react'
import { sha256 } from 'js-sha256'
import moment from 'moment'
import queryString from 'query-string'

// components
// import CodeListNav from '../components/CodeListNav'
// import ProjectHelpModal from '../components/ProjectHelpModal'
import GitHubActionModal from '../components/GitHubActionModal'
import Loader from '../components/Loader'
import Menu from '../components/Menu'
import { durationBreakdown } from '../helpers/moment'
import FileList from '../components/FileList'
import StlButton from '../components/StlButton'
// import ThemeLogo from '../components/ThemeLogo'
import ResultsRow from '../components/ResultsRow'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import {
  appendS,
  cleanProjectName,
  destructureProjectName,
  uriEncodeProjectName,
  uriDecodeProjectName,
  noLeadingSlash,
} from '../helpers/strings'
import { buildResultsMatrix, groupedResultsJson } from '../helpers/data'
import { getCookie } from '../helpers/cookies'
import config from '../config'
import LocalStorage from '../helpers/LocalStorage'
import { scrollTo } from '../helpers/scrollTo'
import githubApi from '../helpers/githubApi'
import CqcApi from '../helpers/cqcApi'

// images & styles
import githubText from '../assets/images/github.png'
import githubLogo from '../assets/images/github-logo.png'
import '../assets/css/Project.css'
import '../assets/css/Results.css'

// constants and global variables
const cqcApi = CqcApi(getCookie("session"))
const initialState = {
  binaryFilesToUpload: [],
  codeOnServer: null,
  files: [],
  filesToUpload: [],
  showResults: true,
  statusRows: [],
  step: 1,
  uploadButtonClassname: 'hide',
  uploadErrors: [],
}
const constStatus = {
    'COMPLETE': 'COMPLETE',
    'COMPUTING_PDF': 'COMPUTING_PDF',
    'RUNNING': 'RUNNING',
    'SETUP': 'SETUP'
  },
  maxConcurrentUploads = 99,
  uploadsPerSecond = 0, // 0 = unlimited
  millisecondTimeout = Math.floor(1000 / uploadsPerSecond),
  uiUploadThreshold = 1000,
  retryAttemptsAllowed = 300,
  retryIntervalMilliseconds = 9000,
  strStatus = {
    [constStatus.COMPUTING_PDF]: 'Test Complete!',
    [constStatus.RUNNING]: 'Running Tests...',
    [constStatus.SETUP]: 'Setting up Tests...',
  },
  tokenCookieName = config.github.tokenCookieName
const tabTitles = [
  'Overview',
  'Issues',
  'Files',
  'Settings',
]

let retryAttempts = 0,
  lastPercentComplete = 0,
  projectName,
  currentUploadQueue,
  statusCheck,
  startCounting,
  testTimeElapsed = 0,
  successfulUploads = 0,
  concurrentUploads = 0,
  ghTreeSha

export default class Project extends Component {
  static contextType = UserContext

  constructor() {
    super()
    this.state = {
      ...initialState,
      dirName: null,
      removeDirName: false,
    }
    this._countUp = this._countUp.bind(this)
    this._restoreDirName = this._restoreDirName.bind(this)
    this._runTests = this._runTests.bind(this)
    this._getTree = githubApi.getTree.bind(this)
  }

  /** @dev Lifecycle methods */
  async componentWillMount() {
    const isWebhookScan = queryString.parse(document.location.search)['webhook']

    projectName = this.props.match ? decodeURIComponent(this.props.match.params.id) : null

    const selectedBranch = projectName.split('/tree/')[1]
    let branchesOptions
    if (selectedBranch) {
      const token = getCookie(tokenCookieName)
      if (!token) this.context.actions.logOut()
      else {
        githubApi.setToken(token)
        const branches = await githubApi.getBranches(
          projectName.split('/')[0],
          projectName.split('/')[1]
        )
        branchesOptions = branches.map(b => {
          let newProjectPath = `${projectName.split('/')[0]}/${projectName.split('/')[1]}/tree/${b.name}`
          newProjectPath = '/project/' + newProjectPath.replace(/\//g,'%2F')
      
          return {
            key: b.commit.sha,
            onClick: () => {
              window.location.href = newProjectPath
            },
            text: b.name,
            value: b.name,
          }
        })
      }
    }
    this.setState({
      branchesOptions,
      isWebhookScan,
      projectName,
      selectedBranch,
      working: true,
    })


    // let lastProjectsAccessed = JSON.parse(getCookie("lastProjectsAccessed") || '[]')
    // lastProjectsAccessed = lastProjectsAccessed.filter(p => p !== cleanProjectName(projectName))
    // let newList = [ cleanProjectName(projectName) ]
    // for (let i = 0; i < 5; i++) {
    //   if (lastProjectsAccessed[i]) newList.push( lastProjectsAccessed[i] )
    // }
    // setCookie("lastProjectsAccessed", JSON.stringify(newList))

    if (queryString.parse(document.location.search)['gh']) this._fetchGithubRepo()
    else if (isWebhookScan) this._fetchGithubScan(isWebhookScan)
    else {
      let testResultSid = LocalStorage.ProjectTestResults.getIds(projectName)
      testResultSid = testResultSid[0]
      if (testResultSid) this._fetchLastTest( testResultSid )
      const fetchedUser = await this.context.actions.fetchUser()
      if (fetchedUser && api.getStlSid()) this._fetchProductCode()
      else setTimeout(this._fetchProductCode, 1000)
    }

    const startTest = queryString.parse(document.location.search)['start_test']
    if (startTest) {
      this._runTests()
      if (window.history.pushState) {
        const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
        window.history.pushState({path: newurl}, '', newurl)
      }
    }

    if (!this.state.results && this.state.testResultSid) this._fetchResults(
      this.state.testResultSid
    )

    this._updateTabFromHash()

  }

  componentWillUnmount() {
    clearTimeout( statusCheck )
    clearInterval( startCounting )
    statusCheck = null
    startCounting = null
    testTimeElapsed = 0
    currentUploadQueue = null
  }

  _updateTabFromHash() {
    let { hash } = window.location
    if (hash) {
      hash = hash.substring(1)
      let newTabIndex
      tabTitles.forEach((title, i) => {
        if (title === hash) newTabIndex = i
      })
      this.setState({
        activeTabIndex: newTabIndex
      })
    }
  }
  
  
  /** @dev Component methods */
  async _fetchResults(stlid) {
    const { data: results } = await api.getTestResult({ stlid })
    this.setState({ results, working: false })
  }

  async _fetchLastTest(testResultSid) {
    this.setState({ fetchingLastTest: true, testResultSid })

    const getLastTest = async (stlid) => {
      if (!stlid) return null
      const getRunTests = await api.getRunTests({ stlid }).catch(() => null)
      const { data } = getRunTests || {}
      const { response } = data || {}
      return response
    }

    let results = testResultSid ? await getLastTest( testResultSid ) : null

    // if (results && (results.status_msg === 'COMPUTING_PDF' || results.status_msg === 'COMPLETE')) results.percent_complete = 100
        
    if (!results) {
      results = testResultSid = null
      this.setState({
        results,
        testResultSid,
      })
      LocalStorage.ProjectTestResults.setIds(projectName)
    }
    else if (!results.test_run_result && results.status_msg !== 'COMPUTING_PDF' && results.status_msg !== 'COMPLETE') {
      // resume GET /run_tests
      startCounting = setInterval(this._countUp, 1000)
      this._initCheckTestStatus(testResultSid)
    }
    // else this.setState({ fetchingLastTest: false, results })
  }

  async _fetchGithubScan(scanId) {
    if (!scanId) return
    const githubScan = await cqcApi.getWebhookScan(scanId)
    if (githubScan) this.setState({
      codeOnServer: githubScan['tree'].map(c => ({
        name: c.path,
        sha256: c.sha,
        status: 'code'
      })),
      results: githubScan['testResults'],
      working: false,
    })
  }

  _fetchProductCode = async () => {
    const { data = {} } = await api.getProject(uriEncodeProjectName(projectName)).catch(() => ({}))
    const { response: projectOnServer = {} } = data
    const { code: codeOnServer = [] } = projectOnServer
    this.setState({
      codeOnServer: codeOnServer.map(c => ({
        ...c,
        status: 'code'
      })),
      working: false,
    })
  }

  _restoreDirName = name => !this.state.removeDirName ? name : noLeadingSlash(this.state.dirName + '/' + name)

  _resetUploadButton = () => {
    clearTimeout( statusCheck )
    clearInterval( startCounting )
    statusCheck = null
    startCounting = null
    this.setState({
      ...initialState,
    })
    currentUploadQueue = null
    retryAttempts = 0
    lastPercentComplete = 0
    this._fetchProductCode()
  }
  
  _uploadFiles = async () => {
    console.log(`begin uploading files: ${uriDecodeProjectName(projectName)}`)
    const thisUploadQueue = currentUploadQueue = new Date().getTime()
    let {
      codeOnServer = [],
      binaryFilesToUpload = [],
      filesToUpload,
      numFilesDropped = 0,
      showCodeList,
    } = this.state
    showCodeList = showCodeList && numFilesDropped <= uiUploadThreshold
    this.setState({
      step: 4,
      codeOnServer: codeOnServer.map(c => {
        return c.status !== 'sync' ? c :
          ({
            ...c,
            status: 'code'
          })
      }),
      showCodeList,
    })

    // clear then show status messages
    let errorCount = 0,
      uploaded = [],
      toUpload = [...binaryFilesToUpload],
      interval
    const checkUploadsComplete = () => {
      if (uploaded.length + errorCount === binaryFilesToUpload.length) { 
        clearInterval(interval)
        if (errorCount === 0) this.setState({ step: 5, showCodeList: false })
        else this.setState({ step: -1 })
        // window.mixpanel.track('Files Uploaded', {
        //   project,
        //   fileCount: binaryFilesToUpload.length,
        //   version,
        // })
      }
    }
    const apiError = (err, file) => {
      console.error(err)
      errorCount++
      this._updateCodeRowStatus(file, 'failed')
      checkUploadsComplete()
    }
    const sendFile = (file) => {
      concurrentUploads++

      // upload file
      const filePath = noLeadingSlash(file.path)
      let thisCodeOnClient = filesToUpload.find(f => this._restoreDirName(f.name) === filePath)
      thisCodeOnClient.status = 'upload'
      const thisCodeOnServer = this.state.codeOnServer ? this.state.codeOnServer
        .filter(c => this._restoreDirName(c.name) !== filePath)
        .concat(thisCodeOnClient) :
          null
      this.setState({
        codeOnServer: thisCodeOnServer,
      })
      const code = file.code
      api.putCode({
        name: thisCodeOnClient.name,
        code,
        project: cleanProjectName(projectName)
      })
      .then(apiResponse => {
        successfulUploads++
        concurrentUploads--
        if (!apiResponse) apiError(null, file)
        else {
          this._updateCodeRowStatus(file, 'code')
          uploaded.push(file)
          checkUploadsComplete()
        }
      })
      .catch(err => apiError(err, file))
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
          // console.log(`upload ${file.name} after pausing ${millisecondTimeout} milliseconds with ${concurrentUploads} files in queue and ${successfulUploads} successful uploads`)
          sendFile(file)
        }
      }
    }
    if (
      toUpload.length > maxConcurrentUploads ||
      (millisecondTimeout & millisecondTimeout !== Infinity)
    ) interval = setInterval(
      sendFiles,
      millisecondTimeout
    )
    else if (toUpload.length) {
      toUpload.forEach(f => sendFile(f))
    }
    else this.setState({ step: 5, showCodeList: false })

  }

  _runTests = async (fetchFiles) => {
    console.log(`begin testing repo: ${projectName}`)
    if (fetchFiles) {
      const [ owner, repo, branch ] = destructureProjectName(projectName)
      const { tree } = await githubApi.getTree(
        ...destructureProjectName(projectName)
      )
      if (!tree) return
      
      const { sha } = tree
      let newProjectPath = `${owner}/${repo}/tree/${branch}`
      newProjectPath = '/project/' + newProjectPath.replace(/\//g,'%2F')
      if (sha) newProjectPath += '?gh=' + sha

      window.location.href = newProjectPath
    }
    else {
      clearTimeout( statusCheck )
      clearInterval( startCounting )
      statusCheck = null
      startCounting = setInterval(this._countUp, 1000)
      testTimeElapsed = 0
      successfulUploads = 0
      this.setState({
        activeTabIndex: 0,
        step: 6,
        filesToUpload: [],
        binaryFilesToUpload: [],
        results: null,
        testResultSid: null,
        ghTree: {},
        branchName: null,
        repo: null,
        owner: null,
        uploadErrors: [],
      })
      await this._fetchProductCode()

      // scrollTo('bottom', true)

      // tell the server to run tests
      const runTestsError = (err) => {
        err = err || new Error('POST /run_tests returned a bad response')
        alert(err.message)
        this.setState({
          step: -1,
          statusRows: []
        })
        console.error(err)
        return null
      }
      const runTests = await api.postTestProject({
        projectName: uriEncodeProjectName(projectName)
      }).catch(runTestsError)
      if (runTests) {
        const { stlid } = runTests.data
        // window.mixpanel.track('Test Run',
        //   {
        //     project: projectName,
        //     stlid,
        //     fileCount: this.state.codeOnServer.length,
        //     version,
        //     timeElapsed: testTimeElapsed,
        //   }
        // )
        LocalStorage.ProjectTestResults.setIds(projectName, [stlid])
        this._initCheckTestStatus(stlid)
      }
    }
  }

  async _initCheckTestStatus(stlid) {
    clearTimeout( statusCheck )
    lastPercentComplete = 0
    if (!testTimeElapsed && this.state.results) {
      const now = new Date()
      const start = new Date(this.state.results.start)
      testTimeElapsed = Math.floor((now.getTime() - start.getTime()) / 1000)
    }
    this.setState({
      step: 7,
      showResults: true,
      statusRows: null,
      testResultSid: stlid,
    })
    // scrollTo('bottom', true)
    // check the status of the test
    const checkStatusError = (err) => {
      err = err || new Error('GET /run_tests returned a bad response')
      alert(err.message)
      this.setState({ step: 1 })
      console.error(err)
      return null
    }
    this.setState({ fetchingTest: true })
    const results = await this._checkTestStatus(stlid).catch(checkStatusError)
    this.setState({ fetchingTest: false })
    if (results) {
      if (results.status_msg === 'COMPUTING_PDF' || results.status_msg === 'COMPLETE') {
        clearInterval( startCounting )
        testTimeElapsed = 0
        this._fetchResults(stlid)
        this.setState({ step: 8 })
      }
      else this._initCheckTestStatus(stlid)
    }    
  }

  _checkTestStatus(stlid) {
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
        this.setState({
          step: -1,
        })
        console.error(err || new Error('GET /run_tests returned a 502 Bad Gateway response'))
        reject()
      }

      this.setState({ fetchingTest: true })
      const getRunTests = await api.getRunTests({ stlid }).catch(noConnection)
      this.setState({ fetchingTest: false })
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
      if (response && response.stlid !== this.state.testResultSid) {
        console.log('mismatch', response.stlid, this.state.testResultSid)
        clearInterval( statusCheck )
        reject()
      }

      // setting up the tests
      if (response && response.status_msg === 'SETUP') {
        if (this.state.statusMessage !== 'SETUP') this.setState({
          statusMessage: 'SETUP'
        }) 
      }
      else if (this.state.statusMessage === 'SETUP') {
        this.setState({
          statusMessage: response.status_msg
        })  
      }

      // update result data in `state`
      if (
        response && 
        response.percent_complete &&
        response.percent_complete >= lastPercentComplete
      ) this.setState({
        results: response,
        reconnecting: false,
      })

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
        this.setState({ results: response, reconnecting: false })
        // window.mixpanel.track('Test Completed', {
        //   project: projectName,
        //   stlid,
        //   fileCount: this.state.codeOnServer ? this.state.codeOnServer.length : 0,
        //   version,
        //   timeElapsed: testTimeElapsed,
        // })
        resolve(response)
      }

      // the incoming response is from the current test
      else if (reconnecting || response.stlid === this.state.testResultSid) {
        // we should be fetching or not
        if (
          !this.state.fetchingTest &&
          (retryAttempts <= retryAttemptsAllowed || lastPercentComplete === 0)
        ) {
          retryAttempts++
          console.log(`Test Status request #${retryAttempts} at ${lastPercentComplete}% complete`)
          statusCheck = setTimeout(
            () => { resolve(this._checkTestStatus(stlid)) },
            retryIntervalMilliseconds
          )
        }
        else reject()
      }
      else reject()
    })
  }

  _countUp() {
    const { statusMessage, step } = this.state
    testTimeElapsed++
    let testDuration = (testTimeElapsed % 60).toString() + ' second' + appendS(testTimeElapsed % 60)
    if (Math.floor(testTimeElapsed / 60)) testDuration = Math.floor(testTimeElapsed / 60) + ' minute' + appendS(Math.floor(testTimeElapsed / 60)) + ', ' + testDuration
    const button = document.getElementById('running_tests_button')
    if (button) button.innerHTML = (
      statusMessage === 'RUNNING' &&
      step !== 6
    ) ? `${strStatus[constStatus.RUNNING]} (${testDuration})` : `${strStatus[constStatus.SETUP]} (${testDuration})`
  }

  _updateCode = (row, status) => {
    const { codeOnServer, showCodeList } = this.state
    const newCodeOnServer = status ? codeOnServer.map(c => {
      if (c.name !== row.name) return c
      else return { ...c, status }
    }) :
    codeOnServer.filter(
      c => c.name !== row.name
    )
    this.setState({
      codeOnServer: newCodeOnServer,
      showCodeList: newCodeOnServer.length ? showCodeList : false,
    })
  }

  _removeFileToUpload = file => {
    const updatedBinaryFilesToUpload = this.state.binaryFilesToUpload.filter(
      b => b.name !== file.name
    )
    const updatedCodeOnServer = this.state.codeOnServer.filter(
      b => b.name !== file.name
    )
    const step = updatedBinaryFilesToUpload.length ? this.state.step : 1
    this.setState({
      binaryFilesToUpload: updatedBinaryFilesToUpload,
      codeOnServer: updatedCodeOnServer,
      step,
    })
  }

  _showCodeList = () => {
    const showCodeList = !this.state.showCodeList
    const showDropzone = !showCodeList && this.state.showDropzone
    this.setState({ showCodeList, showDropzone })
  }

  _toggleDropzone = () => {
    const showDropzone = !this.state.showDropzone
    this.setState({ showDropzone })
    if (showDropzone) setTimeout(() => {
      scrollTo('dropzone', true, document.getElementById('ftl_navbar').offsetHeight) },
      300
    )
  }

  _updateCodeRowStatus = (file, status) => {
    const { codeOnServer = [], filesToUpload = [] } = this.state
    const filePath = noLeadingSlash(file.path)
    let thisCodeOnClient = filesToUpload.find(f => this._restoreDirName(f.name) === filePath) || {}
    thisCodeOnClient.status = status
    this.setState({
      codeOnServer: (codeOnServer || [])
        .filter(c => this._restoreDirName(c.name) !== filePath)
        .concat(thisCodeOnClient)
    })
  }

  _setState = state => this.setState(state || initialState)

  /** @title GitHub */
  _fetchGithubRepo = async () => {

    /** @dev Fetch GitHub repo or lastScan if querystring param is found */
    ghTreeSha = queryString.parse(document.location.search)['gh']
    if (ghTreeSha) {
      if (window.history.pushState) {
        const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`
        window.history.pushState({path: newurl}, '', newurl)
      }
      console.log(`begin fetching github repo: ${projectName}`)
      const token = getCookie(tokenCookieName)
      if (token) {
        githubApi.setToken(token)
        this.setState({ working: true })
        const [ owner, repo, ref, branchName ] = projectName.split('/')
        const { tree } = await this._getTree(
          owner,
          repo,
          branchName,
        )
        if (tree && tree.tree) {

          // Subscribe to GitHub webhook event
          const webhookSubscription = await cqcApi.putWebhookSubscription({
            channel: 'github',
            environment: process.env['REACT_APP_FTL_ENV'],
            ref: `refs/heads/${branchName}`,
            repository: `${owner}/${repo}`,
            sid: getCookie("session"),
          })
          console.log({webhookSubscription})

          if (!webhookSubscription || webhookSubscription.testNeededOnTreeSha) {
            this.setState({
              activeTabIndex: 2,
              ghTree: tree,
              branchName,
              repo,
              owner,
              step: 4,
              working: false,
            })
            this._testGithubRepo() 
          }
          else if (webhookSubscription['lastScan']) {
            this.setState({
              codeOnServer: webhookSubscription['lastScan']['tree'] ? webhookSubscription['lastScan']['tree'].map(c => ({
                name: c.path,
                sha256: c.sha,
                status: 'code'
              })) : null,
              results: webhookSubscription['lastScan']['testResults'] ? webhookSubscription['lastScan']['testResults'] : null,
              working: false,
            })
          }
          else {
            this.setState({
              codeOnServer: webhookSubscription['tree'] ? webhookSubscription['tree'].map(c => ({
                name: c.path,
                sha256: c.sha,
                status: 'code'
              })) : null,
              results: webhookSubscription['testResults'] ? webhookSubscription['testResults'] : null,
              working: false,
            })
          }
        }
      }
    }    
  }

  _testGithubRepo = async () => {
    console.log(`begin uploading files: ${projectName}`)
    const { owner, repo, ghTree } = this.state
    const thisUploadQueue = currentUploadQueue = new Date().getTime()
    await this._fetchProductCode()

    // clear then show status messages
    let uploadErrors = [],
      uploaded = [],
      toUpload = ghTree.tree.filter(t => t.type === 'blob'),
      retryFailedUploadsAttempt = 0,
      interval
    const treeSize = toUpload.length

    this.setState({
      ghFileCount: treeSize,
    })

    const checkUploadsComplete = () => {
      if (uploaded.length + uploadErrors.length === treeSize) { 
        if (!uploadErrors.length) {
          clearInterval(interval)
          this._fetchProductCode()
          // window.mixpanel.track('GitHub Files Uploaded', {
          //   project: projectName,
          //   fileCount: toUpload.length,
          //   version,
          // })
          this._runTests()
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
          this.setState({ step: -1, uploadErrors })
        }
      }
      this.setState({
        ghUploaded: uploaded.length,
      })
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
        const synchronized = Boolean(this.state.codeOnServer.find(f => f.sha256 === binStringToHash))

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
            project: cleanProjectName(projectName),
          })
          .then(res => {putCodeCallback(res, file)})
          .catch(err => apiError(err, file))
        }
        // api.putCode({
        //   name: file.path,
        //   code: 'data:application/octet-stream;base64,' + blob['content'],
        //   project: encodeURIComponent(projectName),
        // })
        // .then(apiResponse => {
        //   successfulUploads++
        //   concurrentUploads--
        //   if (!apiResponse) apiError(null, file)
        //   else {
        //     // this._updateCodeRowStatus(file, 'code')
        //     uploaded.push(file)
        //     checkUploadsComplete()
        //   }
        // })
        // .catch(err => apiError(err, file))
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

  /** @dev Sub components */
  Instructions = () => {
    const {
      codeOnServer,
      step,
    } = this.state

    // fetching project Code
    if (!codeOnServer) return <div>
      <p className="lead">Syncing your project... Please wait...</p>
    </div>

    // show the Code List
    else if (step !== 4) return <div className="upload-status">
      <FileList {...this.props}
        state={this.state}
        runTests={this._runTests}
        setState={this._setState}
        restoreDirName={this._restoreDirName}
        toggleDropzone={this._toggleDropzone}
        removeFileToUpload={this._removeFileToUpload}
        showLoader={deleting => this.setState({ deletingFiles: deleting })}
        updateCode={this._updateCode} />
    </div>

    else return null
  }

  /** @dev Render component */
  render() {
    let {
      binaryFilesToUpload,
      branchName,
      branchesOptions,
      codeOnServer,
      deletingFiles,
      droppingFiles,
      numFilesDropped = 0,
      numFilesToDelete,
      owner,
      reconnecting,
      redirect,
      repo,
      results,
      selectedBranch,
      showGithubFiles,
      showDropzone,
      showResults,
      step,
      testResultSid,
      ghTree = {},
      ghTreeSha,
      ghUploaded = 0,
      ghFileCount = 0,
      uploadErrors = [],
      working,
    } = this.state
    const treeSize = !ghTree.tree ? null : ghTree.tree.filter(t => t.type === 'blob').length
    const percentComplete = Math.floor((ghUploaded / ghFileCount) * 100)
    // console.log({percentComplete, ghUploaded, ghFileCount})
    results = results || { // inital state for the results table
      status_msg: 'SETUP',
      codes: [],
      percent_complete: 0,
    }
    const resultsMatrix = buildResultsMatrix(results)
    showDropzone = showDropzone || (codeOnServer && codeOnServer.length === 0)
    let testDuration = (testTimeElapsed % 60).toString() + ' second' + appendS(testTimeElapsed % 60)
    if (Math.floor(testTimeElapsed / 60)) testDuration = Math.floor(testTimeElapsed / 60) + ' minute' + appendS(Math.floor(testTimeElapsed / 60)) + ', ' + testDuration
    const numFailedUploads = codeOnServer && codeOnServer.length ?
      codeOnServer.filter(c => c.status === 'failed').length : 0
    
    const evaluatingFilesLoaderText = <span>
      Evaluating {numFilesDropped} Files
      <br />&nbsp;
      <p>
        <StlButton default semantic
          onClick={() => { document.location.reload() }}
        >cancel</StlButton>
      </p>
    </span>

    if (droppingFiles) return <Loader text={evaluatingFilesLoaderText} />
    else if (deletingFiles) return <Loader text={`Deleting ${numFilesToDelete} Files`} />
    else if (redirect) return <Redirect to={redirect} />
    else if (working) return <Loader text={`working`} />
    else if (reconnecting) return <Loader text={`Re-establishing Network Connection...`} />
    else return <div className={`theme`}>
      <Menu />
      <section id="project">

        <div className="ftl-section">

          <br /><Link to={'/'} style={{ margin: 18 }}>&laquo; back to Projects</Link>

          <h2 style={{ display: 'block', margin: '18px 18px 0 18px' }}>
            <Icon name={projectName.match('/tree/') ? 'code branch' : 'code'} />&nbsp;
            {projectName.split('/tree/')[0]}
          </h2>

          <div style={{
            display: results && !results.test_run_result ? 'block' : 'none',
            margin: '18px 0',
          }}>
            {/** @title Code Testing  */}
            <section>

              {/* uploading */}
              <div style={{
                width: '100%',
                display: !ghTree.tree && step === 4 ? 'inline-block' : 'none'
              }}>
                <Progress percent={Math.floor((successfulUploads / binaryFilesToUpload.length) * 100)} style={{
                    marginTop: -6,
                  }}
                  color={(successfulUploads / binaryFilesToUpload.length) === 1 ? 'green' : 'yellow'}
                  progress />
                <StlButton className="btn working secondary full-width center-text"
                    style={{
                      verticalAlign: 'middle',
                    }}>Uploading...</StlButton>
              </div>

              {/* run tests */}
              <StlButton style={{
                  display: ![3,4,5,6,7].includes(step) &&
                    !testResultSid && numFailedUploads ? 
                      'block' : 'none',
                }}
                className={'link red'}
                onClick={this._showCodeList}>
                <Icon name="warning sign" />
                {`${numFailedUploads} file${appendS(numFailedUploads)} failed to upload`}
              </StlButton>

              {/** @title Results Status Table */}
              {/** @todo Refactor to its own component */}
              <Segment secondary id="last_test" style={{
                  display: showResults && testResultSid && [5,6,7].includes(step) ? 'inline-block' : 'none',
                  width: '100%',
                  margin: 0,
                }}>
                  <span
                    style={{
                      display: step === 6 ? 'inline-block' : 'none',
                      verticalAlign: 'middle',
                    }}>Setting Up Tests...</span>

                <span
                  style={{
                    display: step === 7 ? 'inline-block' : 'none',
                    verticalAlign: 'middle',
                  }}>Testing Project...</span>

                {
                  results ? <Progress percent={results.percent_complete || 0} style={{
                    marginTop: 6,
                  }}
                  color={results.status_msg === 'COMPUTING_PDF' || results.status_msg === 'COMPLETE' ? 'green' : 'yellow'}
                  progress /> : null
                }
              </Segment>

            </section>
          </div>
        
        </div>

        <UserContext.Consumer>
          {(userContext) => {
            const { user } = userContext ? userContext.state : {}
            if (user && (user.isSubscriber || !process.env.REACT_APP_USE_PAYWALL)) {

              const { test_run: testRun, test_run_result: testResults = [] } = results
              const fileCount = testResults.length
              const startTest = testRun ? moment(testRun.start) : null
              const endTest = testRun ? moment(testRun.end) : null
              let languagesFound = new Array()
              let toolsUsed = new Array()
              testResults.forEach(c => {
                languagesFound.push(c['test_suite_test']['test_suite']['language'])
                toolsUsed.push(c['test_suite_test']['test_suite']['name'])
              })
              languagesFound = Array.from(new Set(languagesFound)).join(', ')
              toolsUsed = Array.from(new Set(toolsUsed)).join(', ')

              const OverviewContents = () => testResultSid || (results && results.test_run_result) ? <div className="overview">          
                <span
                style={{
                  display: [6,7].includes(step) ? 'inline-block' : 'none',
                  verticalAlign: 'middle',
                }}>Test in progress...</span>
                
                {/* <Segment color="blue" style={{
                  display: Boolean(results && results.test_run) ? 'block' : 'none'
                }} className="overview-segment">
                  <h3>Grade</h3>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '150%'
                  }}>
                    <div style={{
                      marginTop: 45,
                      color: 'white',
                      borderRadius: 9,
                      background: resultsMatrix.high ? 'red' :
                        resultsMatrix.medium ? 'orange' :
                          resultsMatrix.low ? 'blue' : 'gray'
                    }}>
                      {
                        resultsMatrix.high ? 'Poor' :
                          resultsMatrix.medium ? 'Normal' :
                            resultsMatrix.low ? 'Good' : 'None'
                      }
                    </div>
                  </div>
                </Segment> */}

                <div className="overview-segment" style={{
                    display: Boolean(results && results.test_run) ? 'block' : 'none'
                  }}>
                  <h3>Testing Results Breakdown</h3>
                  <Segment color="blue">

                    <Table basic='very' celled className="issues-table">
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell style={{borderTop: 'none'}}>Issue Severity</Table.HeaderCell>
                          <Table.HeaderCell style={{borderTop: 'none'}}>Number of Issues</Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        <Table.Row>
                          <Table.Cell>
                            High Severity
                          </Table.Cell>
                          <Table.Cell className={resultsMatrix['high'] ? 'red' : ''}>{resultsMatrix['high']}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell>
                            Medium Severity
                          </Table.Cell>
                          <Table.Cell className={resultsMatrix['medium'] ? 'orange' : ''}>{resultsMatrix['medium']}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell>
                            Low Severity
                          </Table.Cell>
                          <Table.Cell className={resultsMatrix['low'] ? 'yellow' : ''}>{resultsMatrix['low']}</Table.Cell>
                        </Table.Row>
                      </Table.Body>
                    </Table>
                  </Segment>
                  <a onClick={() => { this.setState({ activeTabIndex: 1 }) }}>
                    See Issues
                  </a>
                  &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                  <Link to={`/results/${testResultSid}/?gh=${ghTreeSha}`} target="_blank">
                    View Full Report
                  </Link>
                </div>

                <div className="overview-segment" style={{
                    display: Boolean(results && results.test_run) ? 'block' : 'none'
                  }}>
                  <h3>Testing Information</h3>
                  <Segment color="blue">

                    <Table basic='very' celled className="tests-table">
                      <Table.Body>
                        <Table.Row>
                          <Table.Cell>
                            Languages Found
                          </Table.Cell>
                          <Table.Cell>{languagesFound}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell>
                            Tools Used
                          </Table.Cell>
                          <Table.Cell>{toolsUsed}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell>
                            Files Tested
                          </Table.Cell>
                          <Table.Cell>{fileCount}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell>
                            Test Duration
                          </Table.Cell>
                          <Table.Cell>{durationBreakdown(startTest, endTest)}</Table.Cell>
                        </Table.Row>
                      </Table.Body>
                    </Table>
                  </Segment>
                </div>

                {/* <Segment color="blue" style={{
                  display: Boolean(results && results.test_run) ? 'block' : 'none'
                }} className="overview-segment">
                  <h3>Files</h3>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '150%',
                    paddingTop: 30,
                  }}>
                    {codeOnServer ? codeOnServer.length : ''} files
                  </div>
                </Segment> */}

                <div style={{clear: 'left'}} />

              </div> : <div style={{ display: step !== 6 ? 'block' : 'none'}}>
                <h3>No results found. Initiate a test?</h3>
                <StlButton className="small" semantic
                  onClick={() => {this._runTests(true)}}>Initiate a Test</StlButton>
              </div>

              const Overview = () => <div>
                {
                  !selectedBranch ? null : <div style={{ paddingBottom: 18 }}>
                    Branch&nbsp;
                    <Select options={branchesOptions} defaultValue={selectedBranch}
                      onChange={(e) => {
                        console.log(e.target)
                      }} />
                  </div>
                }
                <OverviewContents />
              </div>

              const Files = () => <div>
                {/** @title Upload GitHug repo */}
                <div style={{
                  display: treeSize &&
                    (ghUploaded !== ghFileCount) ? 'block' : 'none',
                  clear: 'right',
                  paddingTop: 18,
                  }} className="repo-list">
                    <h3 style={{ padding: 0 }}>GitHub Repo: <code>{owner}/{repo}</code></h3>
                    <h3 style={{ padding: 0, margin: 0 }}>Branch: <code>{branchName}</code></h3>
                    <p style={{ marginTop: 15 }}>GitHub Tree SHA: <code>{ghTree.sha}</code></p>
                    <p>
                      Assessing {ghUploaded} of {treeSize} total files &nbsp;
                      <a onClick={() => { this.setState({ showGithubFiles: !showGithubFiles })}}>
                        show / hide
                      </a>
                    </p>
                    <Table celled striped className={'data-table'}
                      style={{ display: !showGithubFiles ? 'none' : 'table' }}>
                      <Table.Body>
                      { 
                        ghTree.tree && ghTree.tree.length ? ghTree.tree.map((t, k) => 
                          <Table.Row key={k}>
                            <Table.Cell>
                              { t.path }
                            </Table.Cell>
                          </Table.Row>) : <Table.Row key={0}>
                            <Table.Cell>Not found.</Table.Cell>
                          </Table.Row>
                      }
                      </Table.Body>
                    </Table>
                    {/* <StlButton onClick={this._testGithubRepo}>Run BugCatcher on this Repository</StlButton> */}
                    <Progress percent={percentComplete} style={{
                        marginTop: 21,
                      }}
                      color={(ghUploaded / ghFileCount) === 1 ? 'green' : 'blue'}
                      progress />
                    <div style={{ color: 'red', display: uploadErrors.length ? 'block' : 'none' }}>
                      {uploadErrors.length} files were not uploaded
                    </div>
                </div>

                <section style={{ marginTop: 12 }}>
                  <this.Instructions {...this.state} {...this.props} style={{ marginTop: 30 }} />
                </section>

              </div>

              const Issues = () => {
                if (results && results.test_run_result) {
                  const testId = ((results && results['stlid']) || testResultSid) ?
                  testResultSid || results['stlid'] : null

                  // parse out some data we want to display
                  let { test_run: testRun, test_run_result: testRunResult } = results
                  if (!Array.isArray(testRunResult)) testRunResult = []

                  let [groupedResults, certified] = groupedResultsJson(testRunResult, projectName)

                  const GroupedResults = () => {
                    const rows = groupedResults
                    if (!rows.length) return <h1 style={{ color: 'green' }}>Passing all tests!</h1>
                    else return rows.map((r, i) => <ResultsRow key={i}
                      user={user}
                      {...r} />)
                  }

                  return <React.Fragment>
                    <GroupedResults />
                    <Link to={`/results/${testId}/?gh=${ghTreeSha}`} target="_blank">
                      View Full Report
                    </Link>
                  </React.Fragment>
                }
                else return null
              }

              const panes = [
                {
                  menuItem: tabTitles[0],
                  render: () => <Tab.Pane attached={false}><Overview /></Tab.Pane>,
                },
                {
                  menuItem: tabTitles[1],
                  render: () => <Tab.Pane attached={false}><Issues /></Tab.Pane>,
                },
                {
                  menuItem: `${tabTitles[2]}${codeOnServer ? ' (' + codeOnServer.length + ')' : ''}`,
                  render: () => <Tab.Pane attached={false}><Files /></Tab.Pane>,
                },
                {
                  menuItem: tabTitles[3],
                  render: () => <Tab.Pane attached={false}>
                    <Segment style={{ display: projectName.match('/tree/') ? 'normal' : 'none' }}>
                      <h3>Set up automated testing of your project by integrating with the BugCatcher GitHub Action</h3>
                      <p>You can use BugCatcher in your Continuous Integration / Continuous Deployment workflows on GitHub.</p>
                      <p>Using the <strong><a href="https://github.com/marketplace/actions/ftl-bugcatcher" target="_blank">BugCatcher GitHub Action</a></strong> is as easy as following the instructions found in the <a href="https://github.com/faster-than-light/github-action/blob/master/README.md" target="_blank">Action README instructions</a>.</p>
                      <GitHubActionModal triggerStyle={{
                        float: 'none'
                      }} />
                    </Segment>

                    <Segment>
                      
                      {
                        projectName.match('/tree/') ?
                          <p>Deleting this project will permanently delete tests for all branches of this repository.</p> :
                            <p>Permanently delete all tests for this project and remove it from your Projects list.</p>
                      }
                      
                      <p><StlButton semantic color="red" className="small"
                      onClick={async (e) => {
                        const msg = `Are you sure you want to delete this project`
                        const conf = window.confirm(msg)
                        if (conf) {
                          e.target.disabled = true
                          this.setState({working: true})
                          if (projectName.match('/tree/')) {
                            let projectsToDelete = new Array()
                            const { data: getProjects } = await api.getProject()
                            const { response: projects } = getProjects
                            projects.forEach(p => {
                              const projectRepoIdentifier = projectName.split('/tree/')[0] + '/tree/'
                              if (decodeURIComponent(p).startsWith(projectRepoIdentifier)) {
                                console.log({p})
                                LocalStorage.ProjectTestResults.setIds(decodeURIComponent(p))
                                projectsToDelete.push(
                                  api.deleteProjectPromise(uriEncodeProjectName(decodeURIComponent(p))).catch(() => null)
                                )
                                // subscriptionsToDelete.push(
                                //   cqcApi.deleteWebhookSubscription({
                                //     channel: 'github',
                                //     environment: process.env['REACT_APP_FTL_ENV'],
                                //     ref: `refs/heads/${branchName}`,
                                //     repository: `${owner}/${repo}`,
                                //     sid: getCookie("session"),
                                //   })
                                // )
                              }
                            })
                            await Promise.all([...projectsToDelete, cqcApi.deleteWebhookSubscription({
                              channel: 'github',
                              environment: process.env['REACT_APP_FTL_ENV'],
                              ref: `refs/heads/${selectedBranch}`,
                              repository: `${projectName.split('/')[0]}/${projectName.split('/')[1]}`,
                              sid: getCookie("session"),
                            })])
                          }
                          else await api.deleteProjectPromise(uriEncodeProjectName(projectName)).catch(() => null)
                          this.setState({redirect: '/'})
                        }
                      }}>
                        <Icon name="warning circle" />
                        Delete Project
                      </StlButton></p>
                     </Segment>
                  </Tab.Pane>,
                },
              ]
          
              const ProjectTabs = () => (
                <Tab menu={{ secondary: true, pointing: true }}
                  activeIndex={this.state.activeTabIndex} panes={panes}
                  onTabChange={(evt, data) => {
                    this.setState({ activeTabIndex: data.activeIndex })
                    window.location.hash = data.panes[data.activeIndex]['menuItem'].split(' ')[0]
                  }} />
              )
            
              return <div className={'ftl-tabs ftl-section'}>
                <a href={`https://github.com/${projectName}`} target="_blank"
                  style={{ display: projectName.match('/tree/') ? 'normal' : 'none' }}>
                  <StlButton link className="github-button">
                    View on&nbsp;&nbsp;
                    <img src={githubLogo} alt="GitHub Logo" />
                    <img src={githubText} alt="GitHub Text" />&nbsp;
                    <Icon name="external alternate" />
                  </StlButton>
                </a>
                <ProjectTabs />
              </div>   

            }
            else return <Redirect to={'/'} />
          }}
        </UserContext.Consumer>
      </section>
      <a id="bottom" />
    </div>
  }
}
