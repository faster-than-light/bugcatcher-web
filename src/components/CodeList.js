import React, { Component } from 'react'
import { Checkbox, Icon, Table } from 'semantic-ui-react'

// components
import CodeRow from './CodeRow'
import StlButton from './StlButton'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import { appendS } from '../helpers/strings'
import { noLeadingSlash } from '../helpers/strings'

// images and styles
import '../assets/css/components/Code.css'

export default class CodeList extends Component {
  state = {
    open: false,
    selectedRows: []
  }

  selectedRows = () => {
    const inputs = document.getElementsByTagName("input")
    let rows = []
    for(let i = 0; i < inputs.length; i++) {
        if (inputs[i].type === "checkbox")
          if (inputs[i].checked) {
            if (inputs[i].value.length) rows.push({
              name: inputs[i].value,
              sha256: inputs[i].sha256,
            })}
    }
    return rows
  }

  selectAll = (e,f) => {
    const inputs = document.getElementsByTagName("input")
    for(let i = 0; i < inputs.length; i++) {
        if(inputs[i].type === "checkbox") {
            inputs[i].checked = f.checked
        }
    }
    // const selectAllIsChecked = !this.selectAllToggle.state.checked
    const selectAllIsChecked = !this.state.selectAllIsChecked
    this.setState({
      selectAllIsChecked,
      selectedRows: this.selectedRows()
    })
  }

  async deleteCode() {
    const { selectedRows = [] } = this.state
    const {
      removeFileToUpload,
      restoreDirName,
      showLoader,
      setState,
      state,
      updateCode
    } = this.props
    const {
      binaryFilesToUpload,
      codeOnServer,
      filesToUpload,
      step,
      uploadButtonClassname,
    } = state
    setState({ numFilesToDelete: selectedRows.length })
    if (!selectedRows || !selectedRows.length) {
      this.optionSelector.selectedIndex = 0
      return
    }
    const msg = `Are you sure you want to delete ${selectedRows.length ? selectedRows.length : ''} file${appendS(selectedRows.length)}`
    var conf = window.confirm(msg)
    if (conf) {
      showLoader( true )
      let numFilesToDelete = selectedRows.length
      let numFilesDeleted = 0
      let numDeleteFailures = 0
      let deletedRows = []
      const checkForEnd = () => {
        if (numFilesDeleted + numDeleteFailures === numFilesToDelete) {
          showLoader( false )
          const deletedFileNames = deletedRows.map(d =>d.name)
          const restoredDirDeletedFileNames = deletedRows.map(d =>restoreDirName(d.name))
          const newBinaryFilesToUpload = binaryFilesToUpload.filter(b => !restoredDirDeletedFileNames
            .includes(noLeadingSlash(b.path)))
          const newCodeOnServer = codeOnServer.filter(c => !deletedFileNames
            .includes(c.name))
          setState({
            binaryFilesToUpload: newBinaryFilesToUpload,
            codeOnServer: newCodeOnServer,
            filesToUpload: filesToUpload.filter(f => !restoredDirDeletedFileNames
              .includes(noLeadingSlash(f.path))),
            step: newCodeOnServer.length ? step : 1,
            uploadButtonClassname: newCodeOnServer.length ? uploadButtonClassname : 'hide',
          })
        }
      }
      for (let i = 0; i < selectedRows.length; i++) {
        const row = selectedRows[i]
        const match = binaryFilesToUpload.find(
          c => noLeadingSlash(c.path) === restoreDirName(row.name)
        )
        if (!match) {
          api.deleteCode(
            encodeURIComponent(this.props.state.projectName) + '/' + encodeURIComponent(row.name)
          )
          .then(res => {
            if (res) {
              numFilesDeleted++
              updateCode(row)
              deletedRows.push(row)
              checkForEnd()
            }
          })
          .catch(err => {
            console.error(err)
            numDeleteFailures++
            updateCode(row, 'failed')
            checkForEnd()
          })
        }
        else {
          // remove from binaryFilesToUpload
          numFilesDeleted++
          await removeFileToUpload(row)
          deletedRows.push(row)
          checkForEnd()
        }
      }
    }
  }

  render() {
    const { selectedRows } = this.state
    const {
      state,
      toggleDropzone,
    } = this.props
    const {
      codeOnServer = [],
      showDropzone,
    } = state
    codeOnServer.sort((a, b) => a.name.localeCompare(b.name))

    const Items = () => codeOnServer.length ?
      codeOnServer.map((r, i) => <CodeRow key={r.name + i}
        selectedRows={this.selectedRows}
        checked={selectedRows.map(row => row.name).includes(r.name)}
        saveRows={rows => { this.setState({ selectedRows: rows }) }}
        data={r} />) : <Table.Row key={0}><Table.Cell>No code has been submitted.</Table.Cell></Table.Row>

    const CodeTable = (props) => (
      <Table celled striped className={'data-table'}>
        <Table.Body>
          {props.children}
        </Table.Body>
      </Table>
    )

    const Actions = () => {
      return <div className={'actions'}>
        <a title={showDropzone ? 'Hide Dropzone' : 'Add Files'}
          className="secondary-color"
          style={{
            display: codeOnServer && codeOnServer.length ? 'inline-block' : 'none',
            float: 'right',
            fontSize: '100%',
            cursor: 'pointer',
            marginRight: 9,
            // marginTop: 30,
          }}
          onClick={toggleDropzone}>
          {showDropzone ? 'hide dropzone' : 'add files'}
          <Icon name={showDropzone ? 'minus circle' : 'add circle'}
            style={{ marginLeft: 9, verticalAlign: 'baseline' }} />
        </a>
        <Checkbox //ref={r => this.selectAllToggle = r}
          onChange={this.selectAll}
          checked={this.state.selectAllIsChecked}
          style={{
            marginLeft: 12,
            display: codeOnServer.length ? 'inline-block' : 'none'
          }}
          label="select / deselect all"
          title="select/deselect all" />
        <span style={{fontSize: '120%', marginLeft: 12}}>&#8592;</span>
        <StlButton semantic default
          className={`small ${!selectedRows.length ? 'disabled' : 'primary'}`}
          disabled={!selectedRows.length}
          style={{
            marginLeft: 12
          }}
          onClick={this.deleteCode.bind(this)}>
          {
            !selectedRows.length ?
            `Delete Files` :
            `Delete ${selectedRows.length} selected File${appendS(selectedRows.length)}`
          }
        </StlButton>
      </div>
    }

    const ActionsBottom = () => codeOnServer.length > 5 ? <Actions /> : null

    return (
      <section className="code">
        <UserContext.Consumer>
          {(context) => {
            const { user } = context ? context.state : {}
            if (user) return <div style={{
              display: this.props.state.showCodeList ? 'block' : 'none'
            }}>
              <Actions />
              <CodeTable>
                <Items />
              </CodeTable>
              <ActionsBottom />
            </div>
            else return null
          }}
        </UserContext.Consumer>
      </section>
    )
  }
}