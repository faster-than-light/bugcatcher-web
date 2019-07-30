import React, { Component } from 'react'
import { Icon } from 'semantic-ui-react'

// components
import CodeStatusRow from './CodeStatusRow'

export default class CodeListNav extends Component {
  render() {
    const {
      binaryFilesToUpload,
      codeOnServer,
      filesToUpload,
      showCodeList,
      style,
      successfulUploads,
      toggleCodeList,
    } = this.props

    return <CodeStatusRow
      style={style}
      type={'info'}
      message={
        <div style={{ paddingLeft: 9, cursor: 'pointer' }} onClick={toggleCodeList}>
          <a style={{
            float: 'right',
            marginRight: 12,
          }}>{showCodeList ? 'hide' : 'show'}</a>
          <Icon name={binaryFilesToUpload.length ? 'upload' : 'code'} />
          <strong>{
            !successfulUploads ?
            `${
              binaryFilesToUpload.length ?
                `${binaryFilesToUpload.length} files ready to upload.` :
                  `${codeOnServer.length} files on server.`
            } ${
              filesToUpload.length > binaryFilesToUpload.length ?
              String(filesToUpload.length - binaryFilesToUpload.length)
                + ' files already synchronized.' : ''
            }` :
            `${successfulUploads} of ${binaryFilesToUpload.length} files uploaded.`
          }</strong>
        </div>
      } />

  }
}