/**
 * @title Code
 * @req Allow user to manage Code and run Tests for a Project
 * 
 * @dev UI Steps
 * @step 1 : Show dropzone and file upload button
 * @step 2 : Determine which files need to be uploaded
 * @step 3 : Show "upload & test" button
 * @step 4 : Uploading files
 * @step 5 : Files uploaded, initiate `/test_project`
 * @step 6 : Running tests
 * @step 7 : Results ready
 * @step -1 : Error
 * 
 * @dev API sequence
 * @call 1 : `POST` `code` to `/project/<project_name>`
 * @call 2 : `POST` to `/test_project/<project_name>` (returns a `stlid`)
 * @call 3 : `GET` from `/run_tests/<stlid>` (returns % complete & status)
 * @call 4 : `GET` from `/test_result/<stlid>` (when status="COMPLETE")
 */

import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import Dropzone from 'react-dropzone'
import { Label, Icon, Progress, Table } from 'semantic-ui-react'
import { fromEvent } from 'file-selector'
import { sha256 } from 'js-sha256'
import moment from 'moment'

// components
import CodeListNav from '../components/CodeListNav'
import ProjectHelpModal from '../components/ProjectHelpModal'
import Loader from '../components/Loader'
import Menu from '../components/Menu'
import CodeInstructions from '../components/CodeInstructions'
import CodeList from '../components/CodeList'
import StlButton from '../components/StlButton'
import ThemeLogo from '../components/ThemeLogo'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import { appendS, testStatusToColor, noLeadingSlash } from '../helpers/strings'
import config from '../config'
import LocalStorage from '../helpers/LocalStorage'
import { scrollTo } from '../helpers/scrollTo'
import { version } from '../../package.json'

// images and styles
import '../assets/css/UploadFiles.css'
import '../assets/css/Results.css'

// constants and global variables
const initialState = {
  binaryFilesToUpload: [],
  codeOnServer: null,
  files: [],
  filesToUpload: [],
  showResults: true,
  statusRows: [],
  step: 1,
  uploadButtonClassname: 'hide',
}
const uploadsPerSecond = 0, // 0 = unlimited
  maxConcurrentUploads = 99,
  millisecondTimeout = Math.floor(1000 / uploadsPerSecond),
  uiUploadThreshold = 1000,
  retryAttemptsAllowed = 300,
  retryIntervalMilliseconds = 6000
let retryAttempts = 0,
  lastPercentComplete = 0,
  projectName,
  currentUploadQueue,
  statusCheck,
  startCounting,
  testTimeElapsed = 0,
  successfulUploads = 0,
  concurrentUploads = 0

export default class Code extends Component {
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
  }

  /** @dev Lifecycle methods */
  async componentWillMount() {
    projectName = this.props.match ? this.props.match.params.id : null
    const fetchedUser = await this.context.actions.fetchUser()
    let testResultSid = LocalStorage.ProjectTestResults.getIds(projectName)
    testResultSid = testResultSid[0]

    const getLastTest = async (stlid) => {
      if (!stlid) return null
      const getRunTests = await api.getRunTests({ stlid }).catch(() => null)
      const { data } = getRunTests || {}
      const { response } = data || {}
      return response
    }
  
    let results = testResultSid ? await getLastTest( testResultSid ) : null
    if (fetchedUser && api.getStlSid()) await this._fetchProductCode()
    else setTimeout(this._fetchProductCode, 1000)

    if (results && results.status_msg === 'COMPLETE') results.percent_complete = 100
    this.setState({
      projectName,
      results,
      testResultSid,
    })
    if (!results) {
      results = testResultSid = null
      this.setState({
        results,
        testResultSid,
      })
      LocalStorage.ProjectTestResults.setIds(projectName)
    }
    else if (results.status_msg !== 'COMPLETE') {
      // resume GET /tests_run
      startCounting = setInterval(this._countUp, 1000)
      this._initCheckTestStatus(testResultSid)
    }
  }

  componentWillUnmount() {
    clearTimeout( statusCheck )
    clearInterval( startCounting )
    statusCheck = null
    startCounting = null
    testTimeElapsed = 0
    currentUploadQueue = null
  }

  /** @dev Component methods */
  _fetchProductCode = async () => {
    const { data = {} } = await api.getProject(projectName).catch(() => ({}))
    const { response: projectOnServer = {} } = data
    const { code: codeOnServer = [] } = projectOnServer
    this.setState({
      codeOnServer: codeOnServer.map(c => ({
        ...c,
        status: 'code'
      })),
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
  
  _onDrop = async (files) => {
    this.setState({
      droppingFiles: true,
      numFilesDropped: files.length,
      showDropzone: false,
      statusRows: [],
    })
    files = files.filter(f => !f.path.includes('/.'))
    const binaryFilesToUpload = (await this._assessFiles(files)).filter(f => f)
    this.setState({
      files,
      uploadButtonClassname: 'btn primary full-width center-text',
      step: 3,
      binaryFilesToUpload,
    })
  }

  _assessFiles = async (files) => {
    const dirName = files[0].path.substring(0,1) === '/' ?
      '/' + files[0].path.split('/')[1] : null
    const removeDirName = !dirName ? false :
      files.filter(f => 
        f.path.substring(0, dirName.length) === dirName
      ).length === files.length

    files = files.filter(f => {
      const name = noLeadingSlash(removeDirName ? f.path.replace(dirName, '') : f.path)
      const dir = name.substring(0, name.indexOf('/'))
      return !config.ignoreUploadDirectories.includes(dir)
    })

    this.setState({
      step: 2,
      dirName,
      removeDirName,
      showCodeList: false,
    })
    successfulUploads = 0

    let { codeOnServer = [] } = this.state
    let filesOnServer = [...codeOnServer]
    let fileCount = 0
    let _filesToUpload = files.map(f => ({
      name: noLeadingSlash(removeDirName ? f.path.replace(dirName, '') : f.path),
      path: f.path,
    }))

    const evalFile = (fileToEval) => new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = async () => {
        // get a hash of the file
        let code = reader.result
        const filePath = fileToEval.path
        const base64 = code.substring(code.indexOf('base64'))
        if (base64 !== 'data:') code = 'data:application/octet-stream;' + base64
        else code = 'data:application/octet-stream;base64,'
        let binStringToHash = sha256('base64,')
        if (base64 !== 'data:') binStringToHash = sha256(window.atob(base64.replace('base64,','')))

        // update file with hash
        if (binStringToHash) _filesToUpload = _filesToUpload.map(f => f.name === filePath ? {...f, sha256: binStringToHash} : f)
        else console.log({ file: fileToEval.name, binStringToHash }) // shouldn't happen

        const hashesOnServer = filesOnServer.map(c => c.sha256)
        const fileToUpload = _filesToUpload.find(f => f.path === filePath)

        if (
          binStringToHash && !hashesOnServer.includes(binStringToHash)
        ) {
          codeOnServer = codeOnServer
            .filter(c => c.name !== fileToUpload.name)
            .concat({
              ...fileToUpload,
              status: 'upload'
            })
          fileCount++
          fileToEval.code = code
          fileToEval.filePath = filePath
          resolve(fileToEval) 
        }
        else {
          // local hash matches one from server
          const thisCodeOnServer = filesOnServer.find(s => s.name === fileToUpload.name)
          if (codeOnServer.length && thisCodeOnServer) codeOnServer = codeOnServer.map(c => 
            c.sha256 !== thisCodeOnServer.sha256 ? c
              :({ ...c, status: 'sync' })
          )
          resolve()
        }
      }
      reader.onabort = () => alert('file reading was aborted')
      reader.onerror = () => alert('file reading has failed')
      reader.readAsDataURL(fileToEval)
    })

    const assessedFiles = await Promise.all(files.map(evalFile))
    this.setState({
      droppingFiles: false,
      filesToUpload: _filesToUpload,
      codeOnServer,
    })
    scrollTo('bottom', true)
    return assessedFiles
  }

  _uploadFiles = async (project) => {
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
        if (errorCount === 0) this._runTests()
        else this.setState({ step: -1 })
        window.mixpanel.track('Files Uploaded', {
          project,
          fileCount: binaryFilesToUpload.length,
          version,
        })
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
        project
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
          console.log(`upload ${file.name} after pausing ${millisecondTimeout} milliseconds with ${concurrentUploads} files in queue and ${successfulUploads} successful uploads`)
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
    else this._runTests()

  }

  _runTests = async () => {
    clearTimeout( statusCheck )
    clearInterval( startCounting )
    statusCheck = null
    startCounting = setInterval(this._countUp, 1000)
    testTimeElapsed = 0
    successfulUploads = 0
    this.setState({
      step: 5,
      filesToUpload: [],
      binaryFilesToUpload: [],
      results: null,
      testResultSid: null,
    })
    scrollTo('bottom', true)

    // tell the server to run tests
    const runTestsError = (err) => {
      alert("There was an error.")
      this.setState({
        step: -1,
        statusRows: []
      })
      console.error(err || new Error('POST /run_tests returned a bad response'))
      return null
    }
    const runTests = await api.postTestProject({ projectName }).catch(runTestsError)
    if (runTests) {
      const { stlid } = runTests.data
      window.mixpanel.track('Test Run',
        {
          project: projectName,
          stlid,
          fileCount: this.state.codeOnServer.length,
          version,
          timeElapsed: testTimeElapsed,
        }
      )
      LocalStorage.ProjectTestResults.setIds(projectName, [stlid])
      this._initCheckTestStatus(stlid)
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
      step: 6,
      showResults: true,
      statusRows: null,
      testResultSid: stlid,
    })
    scrollTo('bottom', true)
    // check the status of the test
    const checkStatusError = (err) => {
      alert("There was an error.")
      this.setState({ step: 1 })
      console.error(err || new Error('GET /run_tests returned a bad response'))
      return null
    }
    this.setState({ fetchingTest: true })
    const results = await this._checkTestStatus(stlid).catch(checkStatusError)
    this.setState({ fetchingTest: false })
    if (results) {
      if (results.status_msg === 'COMPLETE') {
        clearInterval( startCounting )
        testTimeElapsed = 0
        this.setState({ step: 7 })
      }
      else this._initCheckTestStatus(stlid)
    }    
  }

  _checkTestStatus(stlid) {
    if (!stlid) return
    else return new Promise(async (resolve, reject) => {
      const failed = (err) => {
        alert("There was an error running the tests.")
        this.setState({
          step: -1,
        })
        console.error(err || new Error('GET /run_tests returned a 502 Bad Gateway response'))
        reject()
      }
      this.setState({ fetchingTest: true })
      const getRunTests = await api.getRunTests({ stlid }).catch(failed)
      this.setState({ fetchingTest: false })
      const { data } = getRunTests || {}
      const { response } = data || {}
      if (!getRunTests || !response) failed()

      // abort if stlid does not match testResultSid
      if (response && response.stlid !== this.state.testResultSid) {
        console.log('mismatch', response.stlid, this.state.testResultSid)
        clearInterval( statusCheck )
        reject()
      }

      // update result data in `state`
      if (
        response && 
        response.percent_complete &&
        response.percent_complete >= lastPercentComplete
      ) this.setState({
        results: response,
      })

      // `percent_complete` has progressed
      if (
        response && 
        response.percent_complete &&
        response.percent_complete > lastPercentComplete
      ) {
        lastPercentComplete = response.percent_complete
        retryAttempts = 0
      }

      // results are ready
      if (response && response.status_msg === 'COMPLETE') {
        response.percent_complete = 100
        this.setState({ results: response })
        window.mixpanel.track('Test Completed', {
          project: projectName,
          stlid,
          fileCount: this.state.codeOnServer ? this.state.codeOnServer.length : 0,
          version,
          timeElapsed: testTimeElapsed,
        })
        resolve(response)
      }

      // the incoming response is from the current test
      else if (response.stlid === this.state.testResultSid) {
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
    testTimeElapsed++
    let testDuration = (testTimeElapsed % 60).toString() + ' second' + appendS(testTimeElapsed % 60)
    if (Math.floor(testTimeElapsed / 60)) testDuration = Math.floor(testTimeElapsed / 60) + ' minute' + appendS(Math.floor(testTimeElapsed / 60)) + ', ' + testDuration
    const button = document.getElementById('running_tests_button')
    button.innerHTML = `Running Tests... (${testDuration})`
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
    const showDropzone = !showCodeList && showDropzone
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
    const filePath = noLeadingSlash(file.path)
    let thisCodeOnClient = this.state.filesToUpload.find(f => this._restoreDirName(f.name) === filePath)
    thisCodeOnClient.status = status
    this.setState({
      codeOnServer: (this.state.codeOnServer || [])
        .filter(c => this._restoreDirName(c.name) !== filePath)
        .concat(thisCodeOnClient)
    })
  }

  _setState = state => this.setState(state || initialState)

  /** @dev Sub components */
  Instructions = () => {
    const {
      binaryFilesToUpload,
      codeOnServer,
      showCodeList,
    } = this.state

    // fetching project Code
    if (!codeOnServer) return <div>
      <p className="lead">Syncing your project... Please wait...</p>
    </div>

    // fetched 0 files and nothing to upload
    else if (
      codeOnServer && !codeOnServer.length && 
      (!binaryFilesToUpload || !binaryFilesToUpload.length)
    ) return <CodeInstructions {...this.state} {...this.props} />

    // show the Code List
    else return <div className="upload-status">
      <CodeListNav {...this.state}
        successfulUploads={successfulUploads}
        toggleCodeList={this._showCodeList} />
      <CodeList {...this.props}
        state={this.state}
        setState={this._setState}
        restoreDirName={this._restoreDirName}
        toggleDropzone={this._toggleDropzone}
        removeFileToUpload={this._removeFileToUpload}
        showLoader={deleting => this.setState({ deletingFiles: deleting })}
        updateCode={this._updateCode} />
      <CodeListNav {...this.state}
        style={{ display: showCodeList && codeOnServer.length > 5 ? 'block' : 'none' }}
        toggleCodeList={this._showCodeList} />
    </div>
  }

  ShowResults = () => {
    const { results = {}, step } = this.state
    return step && step === 7 ? 
    <Redirect
      to={`/results/${results ? results.stlid : ''}`}
    /> :
    <Link className="btn full-width center-text primary"
      style={{
        display: results && results.status_msg === 'COMPLETE' ? 'inline-block' : 'none',
        verticalAlign: 'middle',
      }}
      to={`/results/${results ? results.stlid : ''}`}
    >{`View Test Results`}</Link>
  }

  /** @dev Render component */
  render() {
    let {
      binaryFilesToUpload,
      codeOnServer,
      numFilesDropped = 0,
      productCode,
      results,
      showCodeList,
      showDropzone,
      showResults,
      step,
      testResultSid,
    } = this.state
    results = results || { // inital state for the results table
      status_msg: 'SETUP',
      codes: [],
    }
    showDropzone = showDropzone || (codeOnServer && codeOnServer.length === 0)
    let testDuration = (testTimeElapsed % 60).toString() + ' second' + appendS(testTimeElapsed % 60)
    if (Math.floor(testTimeElapsed / 60)) testDuration = Math.floor(testTimeElapsed / 60) + ' minute' + appendS(Math.floor(testTimeElapsed / 60)) + ', ' + testDuration
    const numFailedUploads = codeOnServer && codeOnServer.length ?
      codeOnServer.filter(c => c.status === 'failed').length : 0

    if (this.state.droppingFiles) return <Loader text={`Evaluating ${numFilesDropped} Files`} />
    else if (this.state.deletingFiles) return <Loader text={`Deleting ${this.state.numFilesToDelete} Files`} />
    else return <div className={`theme`}>
      <Menu />
      <section id="upload" className="contents">
        <h3 style={{ textAlign: 'center', margin: '36px 0' }}>Feedback or bug reports about the BugCatcher beta? Email <a href={`mailto:${config.helpEmail}`}>{config.helpEmail}</a></h3>
        <UserContext.Consumer>
          {(userContext) => {
            const { user } = userContext ? userContext.state : {}
            if (user && user.isSubscriber) return <div className="upload-container">

              <div style={{
                fontSize: 24,
                verticalAlign: 'middle',
                paddingBottom: 21,
                borderBottom: '1px solid gray'
              }}>
                <ProjectHelpModal {...this.props} />
                <Link to={`/`}>
                  <h1 style={{display: 'inline-block', verticalAlign: 'middle', margin: '0 9px 0 0'}}>{config.productNames[productCode]}</h1>
                  <ThemeLogo productCode={productCode} style={{ width: 180, verticalAlign: 'middle', marginRight: 18 }} />
                </Link>
              </div>

              <section style={{ marginTop: 12 }}>
                <h2 style={{ display: 'inline-block' }}>
                  {`Project: ${projectName}`}
                </h2>
                <this.Instructions {...this.state} {...this.props} style={{ marginTop: 30 }} />
              </section>

              {/* drop files */}
              <div id="dropzone" style={{
                display: showDropzone ? 'block' : 'none',
                clear: 'right',
                paddingTop: 6,
                }}>
                <div className="dropzone">
                  <Dropzone onDrop={this._onDrop.bind(this)}
                    multiple={true}
                    style={{
                      border: 'none',
                      width: '100%',
                      textAlign: 'center',
                    }}
                    getDataTransferItems ={evt => fromEvent(evt)}>
                    <div style={{
                      border: '2px dashed #666',
                      padding: '33px 15px',
                      marginTop: 30,
                      width: '100%'
                    }}>
                      <h2>Drop Your Project Directory Here</h2>
                      <p>If your project has subdirectories you will need to drop your project directory here. Using the "Choose File(s)" button below will not work with subdirectories.</p>
                      <p style={{ fontSize: '111%' }}><strong>BugCatcher Web is optimized for Chrome, and for up to approximately 1000 files at a time.</strong></p>
                      <p>Our lightning fast technology for large code bases will be available in a few weeks, so be sure to sign up for updates!</p>
                      <div className="or">or</div>
                      <button className="btn primary center-text"
                        style={{ padding: '9px 21px' }}>
                        Choose File(s) to Upload
                      </button>
                    </div>
                  </Dropzone>
                </div>
              </div>

              {/* upload files */}
              <aside>
                <div className={this.state.uploadButtonClassname.match('btn') ? '' : 'hide'}>
                  <div className="upload-status">{this.state.statusRows}</div>
                  <div id="status_bottom" />
                  <StlButton
                    className={this.state.uploadButtonClassname}
                    style={{
                      display: step === 3 ? 'inline-block' : 'none',
                      float: 'left',
                      verticalAlign: 'middle',
                      marginRight: 12,
                    }}
                    onClick={() => { this._uploadFiles(projectName) }}>
                    { binaryFilesToUpload.length ? `Upload ${binaryFilesToUpload.length} File${appendS(binaryFilesToUpload.length)} & Start Tests` : 'Start Tests' }
                  </StlButton>
                </div>
                <p><br /></p>
              </aside>
              
              {/** @title Code Testing  */}
              <section>

                {/* run tests */}
                <StlButton style={{
                    display: ![3,4,5,6].includes(step) &&
                      !testResultSid && numFailedUploads ? 
                        'block' : 'none',
                  }}
                  className={'link red'}
                  onClick={this._showCodeList}>
                  <Icon name="warning sign" />
                  {`${numFailedUploads} file${appendS(numFailedUploads)} failed to upload`}
                </StlButton>
                <StlButton style={{
                    display: ![3,4,5,6].includes(step) &&
                      !testResultSid && !numFailedUploads &&
                      codeOnServer &&
                      codeOnServer.length &&
                      codeOnServer.find(c => c.status === 'code') ? 
                        'block' : 'none',
                  }}
                  className={'full-width'}
                  onClick={this._runTests}>Run Tests</StlButton>


                {/* uploading */}
                <div style={{
                  width: '100%',
                  display: step === 4 ? 'inline-block' : 'none'
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

                {/* setup */}
                <StlButton className="btn working secondary full-width center-text"
                  style={{
                    display: step === 5 ? 'inline-block' : 'none',
                    verticalAlign: 'middle',
                  }}>Setting Up Tests...</StlButton>

                {/** @title Results Status Table */}
                {/** @todo Refactor to its own component */}
                <div id="last_test" className="results-container" style={{
                    display: showResults && testResultSid && [1,5,6,7].includes(step) ? 'inline-block' : 'none',
                    width: '100%',
                  }}>
                  <a onClick={this._runTests} style={{ float: 'right' }}>
                    <Icon name="sync" />
                    Re-run Tests
                  </a>
                  <h2 style={{ display: 'inline-block', marginTop: 0 }}>Test Results</h2>
                  <Table color={testStatusToColor(results.status_msg)}>
                    <Table.Body>
                      <Table.Row>
                        <Table.Cell className={`severity ${testStatusToColor(results.status_msg)}-bg`}>
                          <Label ribbon color={testStatusToColor(results.status_msg)} style={{ float: 'left' }}>
                            {results.status_msg}
                          </Label>
                        </Table.Cell>
                        <Table.Cell className="dont-break-out"
                          style={{ width: '78%', fontStyle: 'italic' }}>
                          <span className="grey-color">
                            {`Test ID: ${testResultSid}`}
                          </span>
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell colSpan={2} style={{ fontStyle: 'italic' }}>
                          {`Testing started: ${results.start ? moment(results.start).format("dddd, MMMM Do YYYY, h:mm:ss a") : 'Starting tests...'}`}
                          <br />{`Testing ended: ${results.end && results.end !== 'None' ? moment(results.end).format("dddd, MMMM Do YYYY, h:mm:ss a") : 'In progress...'}`}
                          <Progress percent={results.percent_complete || 0} style={{
                              marginTop: 6,
                            }}
                            color={results.status_msg === 'COMPLETE' ? 'green' : 'yellow'}
                            progress />
                        </Table.Cell>
                      </Table.Row>
                      <Table.Row>
                        <Table.Cell className="light-grey-bg-color" colSpan={2}>
                          <StlButton id="running_tests_button"
                            className="btn working secondary full-width center-text"
                            style={{
                              display: [5,6].includes(step) ? 'inline-block' : 'none',
                              verticalAlign: 'middle',
                            }}>Running Tests... ({testDuration})</StlButton>
                          <this.ShowResults />
                        </Table.Cell>
                      </Table.Row>
                    </Table.Body>
                  </Table>    
                </div>

                {/* start over */}
                <a style={{
                    padding: 12,
                    display: step !== 1 ? 'inline-block' : 'none'
                  }}
                  onClick={() => {
                    LocalStorage.ProjectTestResults.setIds(projectName)
                    this.setState({
                      showResults: false,
                      testResultSid: null,
                      currentUploadQueue: null,
                    })
                    this._resetUploadButton()
                    window.scrollTo({ top: 0 })                  
                  }}>
                  &laquo; start over
                </a>

                {/* run tests regardless of error */}
                <StlButton className="btn small" style={{
                    display: step === -1 ? 'inline-block' : 'none'
                  }}
                  onClick={() => {
                    this._resetUploadButton()
                    this._runTests()
                  }}>
                  run tests &raquo;
                </StlButton>

              </section>
            </div>
            else return <Redirect to={'/'} />
          }}
        </UserContext.Consumer>
      </section>
      <a id="bottom" />
    </div>
  }
}