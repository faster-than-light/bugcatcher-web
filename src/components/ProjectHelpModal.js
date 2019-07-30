import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from 'semantic-ui-react'

// components
import FtlModal from './FtlModal'

// helpers
import config from '../config'

// styles & images
import '../assets/css/components/Modal.css'

export default class ProjectHelpModal extends Component {
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
      title={`Instructions for Working with a Project`}
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
    case "eth": {
      return <ul>
        <li>A detailed list of the Tests run and the Languages supported can be found on our <Link to={'/tools'}>Tools List</Link>.</li>
        <li>Please make sure you upload all files needed to compile/build your project. This includes dependency manifest files like `package.json` and `ethpm.json`.</li>
        <li>Make sure the files you are uploading compile. Your results will not show any issues if compilation fails.</li>
        <li>Make sure you are not uploading your `node_modules` or `installed_contracts` directories.</li>
        <li>If you need some help or would like to contact us, please email <a href="mailto:help@fasterthanlight.dev">help@fasterthanlight.dev</a>.</li>
      </ul>
    }
    case "python": {
      return <ul>
        <li>A detailed list of the Tests run and the Languages supported can be found on our <Link to={'/tools'}>Tools List</Link>.</li>
        <li>Please make sure you upload all files needed to compile/build your project. This includes dependency manifest files.</li>
        <li>Make sure the files you are uploading compile. Your results will not show any issues if compilation fails.</li>
        <li>If you need some help or would like to contact us, please email <a href="mailto:help@fasterthanlight.dev">help@fasterthanlight.dev</a>.</li>
      </ul>
    }
  }
}
  
