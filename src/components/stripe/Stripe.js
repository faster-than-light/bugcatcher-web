import React, { Component } from 'react'
import { Elements } from 'react-stripe-elements'
import { Icon, Table } from 'semantic-ui-react'

// components
import InjectedCheckoutForm from './CheckoutForm'

export default class Stripe extends Component {
  state = {}

  render() {
    const { user } = this.props
    // no user
    if (!user) return <p>Please log in first.</p>
    // user not on account view
    else if (document.location.href.search('account') < 0) document.location.href='/account'
    // user on account view
    else return <div>
      {user.subscriptions && user.subscriptions.length ?
        <Table><Table.Body>
          {user.subscriptions.map(subscription => {
            const { payment_method: paymentMethod } = subscription
            return <Table.Row>
              <Table.Cell>{paymentMethod.display_name}</Table.Cell>
              <Table.Cell>exp {paymentMethod.expiration_month}/{paymentMethod.expiration_year}</Table.Cell>
              <Table.Cell style={{
                textAlign: 'right',
              }}>
                <Icon name={'delete'} style={{
                  cursor: 'pointer',
                }}
                onClick={() => alert('coming soon')} />
              </Table.Cell>
            </Table.Row>
          })}
        </Table.Body></Table> : null
      }
      <Elements>
        <InjectedCheckoutForm {...this.props} name={user.name} />
      </Elements>
    </div>
  }
}
