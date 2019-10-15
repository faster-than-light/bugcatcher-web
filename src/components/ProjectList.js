import React, { Component } from 'react'
import { Checkbox, Table } from 'semantic-ui-react'

// components
import ProjectRow from './ProjectRow'
import StlButton from './StlButton'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import { appendS } from '../helpers/strings'
import { getCookie, setCookie } from '../helpers/cookies'
import LocalStorage from '../helpers/LocalStorage'

// images and styles
import '../assets/css/components/Code.css'

export default class ProjectList extends Component {
  state = {
    open: false,
    selectedRows: []
  }

  selectedRows = () => {
    const inputs = document.getElementsByTagName("input")
    let rows = []
    for(let i = 0; i < inputs.length; i++) {
        if (inputs[i].type === "checkbox")
          if (inputs[i].checked)
            if (inputs[i].value.length) rows.push(inputs[i].value)
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
    const selectAllIsChecked = !this.selectAllToggle.state.checked
    this.setState({
      selectAllIsChecked,
      selectedRows: this.selectedRows()
    })
  }

  appendS = () => this.state.selectedRows.length > 1 ? 's' : ''

  deleteProjects = async evt => {
    evt.preventDefault()

    const msg = `Are you sure you want to delete ${this.state.selectedRows.length ? this.state.selectedRows.length : ''} project${this.appendS()}`
    var conf = window.confirm(msg)
    if (conf) {
      let { projectsOnServer: remainingProjects } = this.props.state
      const { selectedRows } = this.state
      let numProjectsToDelete = selectedRows.length
      const failed = failedDelete => {
        console.error(
          !failedDelete.name ? failedDelete :
          new Error(`failed to delete ${failedDelete.name}`)
        )
        numProjectsToDelete--
      }
      this.state.selectedRows.forEach(p => {
        api.deleteProject(p)
        .then(res => {
          if (res) {
            numProjectsToDelete--
            remainingProjects = remainingProjects.filter(r => r.name !== p)
            this.props.updateProjects( remainingProjects )
            LocalStorage.ProjectTestResults.pruneProjects( remainingProjects )

            let lastProjectsAccessed = JSON.parse(getCookie("lastProjectsAccessed") || '[]')
            lastProjectsAccessed = lastProjectsAccessed.filter(prj => prj !== p)
            setCookie("lastProjectsAccessed", JSON.stringify(lastProjectsAccessed))
        
          }
          else failed(p)
        })
        .catch(failed)
      })
      let interval = setInterval(
        () => {
          if (!numProjectsToDelete) {
            clearInterval(interval)
            remainingProjects = remainingProjects.map(r => {
              if (!selectedRows.includes(r.name)) return r
              else return ({
                name: r.name,
                icon: 'failed',
              })
            })
            this.props.updateProjects( remainingProjects )    
          }
        },
        300
      )
    }
  }

  render() {
    const { selectedRows } = this.state
    const { projectsOnServer = [] } = this.props.state
    projectsOnServer.sort((a, b) => a.name.localeCompare(b.name))

    const Items = () => projectsOnServer.length ?
      projectsOnServer.map(r => <ProjectRow key={r.name}
        selectedRows={this.selectedRows}
        checked={selectedRows.includes(r.name)}
        saveRows={rows => {
          this.setState({ selectedRows: rows })
        }}
        data={r} />) : <Table.Row key={0}>
            <Table.Cell>No code has been submitted.</Table.Cell>
          </Table.Row>

    const ProjectsTable = (props) => <Table celled striped className={'data-table'}>
      <Table.Body>
        {props.children}
      </Table.Body>
    </Table>

    const Actions = () => <div className={'actions'}>
      <Checkbox ref={r => this.selectAllToggle = r}
        onChange={this.selectAll}
        checked={this.state.selectAllIsChecked}
        style={{
          marginLeft: 12,
          display: projectsOnServer.length ? 'inline-block' : 'none'
        }}
        label="select / deselect all"
        title="select/deselect all" />
      <StlButton semantic default
        className={`small ${!selectedRows.length ? 'disabled' : 'primary'}`}
        disabled={!selectedRows.length}
        style={{
          marginLeft: 12
        }}
        onClick={this.deleteProjects}>
        {
          !selectedRows.length ?
          `Delete Projects` :
          `Delete ${selectedRows.length} selected Project${appendS(selectedRows.length)}`
        }
      </StlButton>
    </div>

    const ActionsBottom = () => projectsOnServer.length > 5 ? <Actions /> : null

    return <section className="projects">
      <UserContext.Consumer>
        {(context) => {
          const { user } = context ? context.state : {}
          if (user) return <form>
            <Actions />
            <ProjectsTable>
              <Items />
            </ProjectsTable>
            <ActionsBottom />
          </form>
          else return <p>please log in.</p>
        }}
      </UserContext.Consumer>
    </section>
  }
}