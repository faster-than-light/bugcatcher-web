import React, { Component } from 'react'
import { Modal } from 'semantic-ui-react'

// components
import StlButton from './StlButton'

// styles & images
import '../assets/css/components/Modal.css'

export default class DownloadResultsModal extends Component {
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
    return <React.Fragment>
      <StlButton onClick={()=>this.setState({openModal:true})} semantic>{this.props.format}</StlButton>
      <Modal
        closeIcon
        onClose={() => this.setState({openModal:false})}
        open={this.state.openModal}
        style={{
          backgroundColor: 'Black',
          width: '81%',
          maxWidth: 600,
          color: 'White'
        }}
      >
        <div className={`theme-modal ${this.state.productCode}-theme`}>
          <h2 className="primary-color">Download Your {this.props.format} Test Results</h2>
          <p>Your {this.props.format} results will open in a new window. Please disable any popup blockers for this site.</p>
          <StlButton onClick={this.props.fetch} semantic>
            {`Open ${this.props.format} Results`}
          </StlButton>
        </div>
      </Modal> 
    </React.Fragment>
  }
}
