import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { Checkbox, Icon, Table } from 'semantic-ui-react'

// helpers
import { uriDecodeProjectName } from '../helpers/strings'

export default class ProjectRow extends Component {
  state = { modalOpen: false }

  handleOpen = () => this.setState({ modalOpen: true })

  handleClose = () => this.setState({ modalOpen: false })

  render() {
    const {
      selectedRows,
      saveRows,
      checked,
      data,
    } = this.props
    const { name, icon } = data

    const boxClicked = (e, t) => {
      let rows = selectedRows()
      if (t.checked) rows = rows.concat(t.value)
      else rows = rows.filter(r => r !== t.value)
      saveRows(rows)
    }

    const TableRow = () => (
      <Table.Row>
        <Table.Cell>
          <Checkbox value={name}
            style={{ marginRight: 12 }}
            onChange={boxClicked}
            checked={checked} />
          <Link to={`/project/${name}`}
            style={{ color: icon === 'code' ? 'black' : 'red' }}>
            <Icon name={icon === 'code' ? 'folder open' : 'warning sign'}
              style={{ fontSize: '1.23rem' }} /> {uriDecodeProjectName(name)}
          </Link>
        </Table.Cell>
      </Table.Row>
    )

    return <TableRow />

  }
}
