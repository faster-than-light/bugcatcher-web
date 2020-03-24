import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import {
  Dropdown,
  Icon,
  Loader,
  Radio,
  Select,
  Table,
} from 'semantic-ui-react'

import StlButton from '../../components/StlButton'

export default class TestingQueueTable extends Component {

  render() {

    const {
      branches,
      constStatus,
      disableQueueButtons,
      runningQueue,
      token
    } = this.props

    if (!token || !branches || !branches.length) return null
    else {
      const DropdownActionsMenu = (props) => {
        const { disabled } = props
        return <Dropdown
          text={'more actions'}
          icon='chevron down'
          floating
          labeled
          disabled={disabled}
          style={{ width: 180 }}
          button
          className='icon'
        >
          <Dropdown.Menu>
            <Dropdown.Item icon='delete' text='Reset Items'
              onClick={() => { this._resetRowsInQueue() }}></Dropdown.Item>
            <Dropdown.Item icon='delete' text='Remove Items'
              onClick={() => { this._removeRowsFromQueue() }}></Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      }

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
              <Table.HeaderCell>File Count</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              branches.map(row => {
                const {
                  branches: repoBranches,
                  checked,
                  fileCount,
                  filesUploaded,
                  owner,
                  percentComplete,
                  repo,
                  repoPath,
                  resultsMatrix,
                  status,
                  selectedBranch,
                  testId
                } = row
                const rowKey = `row_${owner}_${repo}`
                const resultsBreakdown = resultsMatrix ? `${resultsMatrix.high} High, ${resultsMatrix.medium} Medium, ${resultsMatrix.low} Low` : 'unavailable'
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
                      <Dropdown.Item icon='cloud upload' text='Publish' disabled />
                      <Dropdown.Item icon='code branch' text='Create Pull Request' disabled />
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
                      let thisRow = branches.find(_r => _r.repoPath === repoPath)
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
                    <Select options={repoBranches.map(b => ({ key: b, value: b, text: b }))}
                      defaultValue={selectedBranch}
                      onChange={e => {
                        let row = branches.find(_r => _r.repoPath === repoPath)
                        if (e.target.tagName === 'SPAN') row.selectedBranch = e.target.innerHTML
                        else row.selectedBranch = e.target.childNodes[0].innerHTML
                        row.projectName = this._projectName(row)
                        this._updateTestingQueueItem(row)
                      }}
                      disabled={status}
                      style={{ zoom: 0.81 }}
                      placeholder={'Select a branch'}>
                    
                    </Select>
                  </Table.Cell>
                  <Table.Cell>{fileCount || '?'}</Table.Cell>
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
        <DropdownActionsMenu disabled={disableQueueButtons} />
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

}

