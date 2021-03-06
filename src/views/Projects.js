/**
 * @title ProjectList
 * @req List all projects belonging to the user
 * 
 * @dev API Requests
 * @call 1 : `GET` `/project`
 * @call 2 : `DELETE` `/project` (optional)
 */

import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'

// components
import ProjectsHelpModal from '../components/ProjectsHelpModal'
import Menu from '../components/Menu'
import ProjectList from '../components/ProjectList'
import ThemeLogo from '../components/ThemeLogo'
import StlButton from '../components/StlButton'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import config from '../config'
import { cleanProjectName } from '../helpers/strings'

// images & styles
import githubText from '../assets/images/github-inverted.png'
import githubLogo from '../assets/images/github-logo-inverted.png'

export default class Projects extends Component {
  state = {}

  static contextType = UserContext

  componentWillMount() {
    this.fetchProjects()
  }

  fetchProjects = async () => {
    if (this.props.user) {
      const { data = {} } = await api.getProject().catch(() => ({}))
      let { response: projectsOnServer = [] } = data
      projectsOnServer = projectsOnServer.map(p => ({
        name: p,
        icon: 'code',
      }))
      this.setState({ projectsOnServer })
    }
  }

  Instructions = () => {
    const { projectsOnServer } = this.state

    if (!projectsOnServer) return <React.Fragment>
      <p className="lead">Syncing your projects... Please wait...</p>
    </React.Fragment>
    else if (projectsOnServer && !projectsOnServer.length) return <React.Fragment>
      <p className="lead">No projects found.</p>
    </React.Fragment>
    else return <React.Fragment>
      <ProjectList {...this.props}
        state={this.state}
        updateProjects={projectsOnServer => {this.setState({ projectsOnServer })}} />
    </React.Fragment>
  }

  render() {
    const { user } = this.props
    const { addNewProject } = this.state
    const Contents = () => {
      if (user) return <div className="white-block upload-container" style={{ borderRadius: 12, padding: '0 18px 18px 18px' }}>
        <div style={{
          // marginTop: 15
          }}>
          <ProjectsHelpModal {...this.props} />
          <h2>Your Projects:</h2>
          <this.Instructions
            state={this.state}
            {...this.props} />
          <StlButton
            onClick={() => {
              let projectName = prompt('What is the name of your project?')
              // projectName = cleanProjectName(projectName)
              if (projectName.length) this.setState({
                addNewProject: encodeURIComponent(
                  projectName.trim().replace(/\s\s+/g, ' ')
                )
              })
            }}>Upload a New Project</StlButton>
            &nbsp;
            <Link to={'/github/repos'}>
              <StlButton className="github-button">
                Test a&nbsp;&nbsp;
                <img src={githubLogo} alt="GitHub Logo" />
                <img src={githubText} alt="GitHub Text" />
                &nbsp;Repository
              </StlButton>
            </Link>
        </div>

      </div>
      else return <div>Please log in.</div>
    }

    if (addNewProject) return <Redirect to={`/code/${addNewProject}`} />
    else return <div className={`theme`}>
      <Menu />
      <section id="upload" className="contents">
            <h3 style={{ textAlign: 'center', margin: '36px 0' }}>Feedback or bug reports about the BugCatcher beta? Email <a href={`mailto:${config.helpEmail}`}>{config.helpEmail}</a></h3>
          <Contents />
      </section>
    </div>
  }
}

