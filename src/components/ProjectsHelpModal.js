import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from 'semantic-ui-react'

// components
import FtlModal from './FtlModal'

// helpers
import config from '../config'

// styles & images
import '../assets/css/components/Modal.css'

export default class ProjectsHelpModal extends Component {
  constructor () {
    super()
    this.state = {
      openModal: false,
      productCode: 'python'
    }
  }

  componentWillMount() {
    if (this.props.productCode) this.setState({
      productCode: this.props.productCode
    })
  }
  
  render() {
    return <FtlModal
      title={`Instructions for Managing Projects`}
      modalTrigger={<a style={{
        color: config.themes[this.state.productCode].primaryColor,
        fontSize: 15,
        marginTop: 9,
        float: 'right'}}><Icon name='help circle' />HELP</a>}
        size={'lg'}>
      <Instructions {...this.props} {...this.state} />
    </FtlModal>
  }
}

const Instructions = (props) => {
  switch (props.productCode) {
    default: {
      return <ul>
        <li>A detailed list of the Tests run and the Languages supported can be found on our <Link to={'/tools'}>Tools List</Link>.</li>
        <li>If you need some help or would like to contact us, please email <a href="mailto:help@fasterthanlight.dev">help@fasterthanlight.dev</a>.</li>
      </ul>
    }
  }
}
  
