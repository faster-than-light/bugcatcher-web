import React, { Component } from 'react'
import { Checkbox, Header, Icon, Modal, Label, Table } from 'semantic-ui-react'

export default class CodeRow extends Component {
  state = { modalOpen: false }

  handleOpen = () => this.setState({ modalOpen: true })

  handleClose = () => this.setState({ modalOpen: false })

  render() {
    const {
      name,
      sha256,
      status,
    } = this.props.data

    const StatusIcon = () => {
      switch (status) {
        case 'failed': return <Icon name="warning sign" color="red" />
        case 'sync': return <Icon name="sync" />
        case 'upload': return <Icon name="upload" color="green" />
        default: return <Icon name="code" />
      }
    }

    const DetailsModal = () => (
      <Modal
        trigger={<span
        // onClick={this.handleOpen}
        >
          <StatusIcon style={{ fontSize: '1.23rem' }} /> {name}
        </span>}
        open={this.state.modalOpen}
        onClose={this.handleClose}
        basic
        size="small"
      >
      </Modal>
    )

    const boxClicked = (e, t) => {
      let rows = this.props.selectedRows()
      if (t.checked) rows = rows.concat({
        name: t.value,
        sha256: t.sha256
      })
      else rows = rows.filter(r => r.name !== t.value)
      this.props.saveRows( rows )
    }

    const TableRow = () => (
      <Table.Row>
        <Table.Cell>
          <Checkbox value={name}
            style={{ marginRight: 12 }}
            sha256={sha256}
            onChange={boxClicked}
            checked={this.props.checked} />
          <DetailsModal />
        </Table.Cell>
      </Table.Row>
    )

    return <TableRow />

  }
}
