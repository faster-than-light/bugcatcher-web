/** @dev Uses Bootstrap styles and scripts referenced in /public/index.html */

import React, { Component } from 'react'

import '../assets/css/components/FtlModal.css'

export default class Modal extends Component {
  render() {
    const {
      actionButtonAction,
      actionButtonText = 'Save',
      closeButtonAction,
      modalId = 'modal_id',
      modalTrigger = 'open',
      showCancel,
      showClose,
      size,
      title
    } = this.props
    const modalLabelId = modalId + '_label'

    const ActionButton = () => !actionButtonAction ? null :
      <button type="button" className="btn btn-primary"
        data-dismiss="modal"
        onClick={actionButtonAction}>
        {actionButtonText}
      </button>
    const Trigger = () => <span data-toggle="modal" data-target={`#${modalId}`}>
      {modalTrigger}
    </span>
    const Header = () => !title && !showClose ? null :
    <div className="modal-header">
      <h5 className="modal-title" id={modalLabelId}>{title}</h5>
      <button type="button" className="close" data-dismiss="modal" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    const Cancel = () => showCancel === false ? null :
      <button className="link" data-dismiss="modal" onClick={closeButtonAction}>cancel</button>
    const Footer = () => !actionButtonAction ? null :
      <div className="modal-footer">
        <Cancel />
        <ActionButton />
      </div>

    return <React.Fragment>
      <Trigger />
      <div className="modal fade ftl-modal" id={modalId} role="dialog" aria-labelledby={modalLabelId} aria-hidden="true">
        <div className={`modal-dialog modal-${size}`} role="document">
          <div className="modal-content">
            <Header />
            <div className="modal-body">
              {this.props.children}
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </React.Fragment>
  }
}
