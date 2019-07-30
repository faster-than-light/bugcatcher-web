import React, { Component } from 'react'
import { Icon, TextArea } from 'semantic-ui-react'

// components
import Loader from './Loader'
import FtlModal from './FtlModal'

// helpers
import api from '../helpers/api'

// styles & images
import '../assets/css/components/Modal.css'

export default class AnnotationModal extends Component {
  state = {
    productCode: 'python',
  }

  componentWillMount() {
    const { annotation, productCode } = this.props
    this.setState({
      annotation,
      productCode,
    })
  }

  async _saveAnnotation(annotationObject) {
    const { annotation, testResultId } = annotationObject
    this.setState({ savingAnnotation: true })
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    window.scrollTo({ top: 0 })
    if (
      await api.postAnnotation({
        testResultId,
        annotation,
      })
    ) {
      this.setState({
        annotation: annotationObject,
        openModal: false,
        savingAnnotation: false,
      })
      window.scrollTo({ top: scrollTop })
    }
    else {
      this.setState({ savingAnnotation: false })
      alert('Oops, there was an error.')
    }
  }

  render() {
    const { annotation: annotationObject, initialAnnotationText, savingAnnotation } = this.state
    let { annotation, project, testResultId } = annotationObject
    annotation = annotation && annotation !== ' ' ? annotation : ''

    if (savingAnnotation) return <Loader text={`Saving`} />
    else return <div className={'annotation-modal'}>
      <FtlModal
        title={`Leave Notes`}
        modalId={testResultId}
        size="lg"
        modalTrigger={<span
          onClick={() => this.setState({ initialAnnotationText: annotation })}>
          <Icon name={'edit'} 
            style={{
              cursor: 'pointer',
              float: 'right',
              fontSize: '120%',
            }}
            color={'grey'}
            title={`Leave a Note`}
          />
          <pre style={{ margin: 0 }}>{annotation.replace('↵', '\n')}</pre>
        </span>}
        actionButtonAction={() => {
          this._saveAnnotation({
            project,
            testResultId,
            annotation: annotation || ' ',
          })
        }}
        closeButtonAction={() => this.setState({ annotation: {
          project,
          testResultId,
          annotation: initialAnnotationText,
        } })}
      >
        <TextArea ref={r => this.annotationText = r}
          value={annotation}
          onChange={ev => {
            const state = { annotation: {
              ...this.state.annotation,
              annotation: ev.target.value,
            }}
            this.setState(state)}
          }
          placeholder='Type your notes here' />
      </FtlModal>
    </div>
  }
}
