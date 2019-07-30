import React, { Component } from 'react'
import { Label, Table } from 'semantic-ui-react'

// helpers
import { severityToColor } from '../helpers/strings'
import AnnotationModal from '../components/AnnotationModal'

export default class ResultsRow extends Component {
  render() {
    const {
      annotation,
      fetchProjectAnnotations,
      severity,
      testId,
      testResultId,
      title,
      project,
      description,
      location,
      resources,
      user,
    } = this.props
    const color = severityToColor(severity)
    const moreInfo = resources.map((r, i) => {
      return <div key={i}>
        <a href={r} target="_blank">{r}</a>
        <br />
      </div>
    })

    const Instances = () => {
      const instances = location.map((l, _key) => {
        const filename = l[0]
        const commentary = l[1] !== 'None' ? <div className="commentary">{l[1]}</div> : null
        return <div key={_key}>
          {filename}
          {commentary}
        </div>
      })
      return <Table.Row>
        <Table.Cell className="grey-color light-grey-bg-color right-border"
          style={{ verticalAlign: 'top'}}>Instances</Table.Cell>
        <Table.Cell>{instances}</Table.Cell>
      </Table.Row>
    }

    const Annotations = () => <Table.Row>
      <Table.Cell style={{ verticalAlign: 'top' }} className="grey-color light-grey-bg-color right-border">Notes</Table.Cell>
      <Table.Cell className="dont-break-out">
        <AnnotationModal fetchProjectAnnotations={fetchProjectAnnotations}
          annotation={{annotation, project, testId, testResultId}} />
      </Table.Cell>
    </Table.Row>

    const Description = () => description && description === 'None' ? null : <Table.Row>
      <Table.Cell colSpan={2}>{description}</Table.Cell>
    </Table.Row>

    return <Table color={color}>
      <Table.Body>
        <Table.Row>
          <Table.Cell className={`severity ${color}-bg`} colSpan={2}>
            <Label ribbon color={color} style={{ float: 'left' }}>{severity}</Label>
            <span>{title}</span>
          </Table.Cell>
        </Table.Row>
        <Description />
        <Annotations />
        <Instances />
        <Table.Row>
          <Table.Cell style={{ verticalAlign: 'top' }} className="grey-color light-grey-bg-color right-border">Resources</Table.Cell>
          <Table.Cell className="light-grey-bg-color dont-break-out">{moreInfo}</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>    
  }
}
