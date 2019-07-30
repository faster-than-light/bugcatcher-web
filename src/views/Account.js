import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'
import { Checkbox, Icon, Table } from 'semantic-ui-react'
import moment from 'moment'

// components
import Menu from '../components/Menu'
import Loader from '../components/Loader'
// import Stripe from '../components/stripe/Stripe'

// helpers
import api from '../helpers/api'
import config from '../config'
import { fetchEntitlement } from '../helpers/data'

export default class Account extends Component {
  state ={}

  componentWillMount() {
    this.setState({ user: this.props.user })
  }

  toggleAutoRenew = async () => {
    let { user } = this.props
    const userSubscriptions = user ? user.subscriptions : []
    const activeSubscription = userSubscriptions.find(s => s.status === 'active')
    const subscription = activeSubscription || userSubscriptions[0]
    const status = subscription.status === 'active' ? 'suspended' : 'active'
    if (!subscription) return false
    else {
      this.setState({ updatingSubscription: true })
      const errorUpdating = () => {
        alert('There was a problem. Please try again.')
      }
      const updateSubscriptionStatus = await api.updateSubscriptionStatus({
        stlid: subscription.stlid,
        data: { status }
      })
      .catch(() => {
        errorUpdating()
        return true
      })
      if (!updateSubscriptionStatus) errorUpdating()

      const subscriptions = userSubscriptions.map(
        s => s.stlid !== subscription.stlid ? s : { ...s, status }
      )
      user = { ...user, subscriptions }
      this.props.setUser(user)
    }
  }

  toggleShowAddCard = () => { this.setState({ showAddCard: false }) }

  render() {
    const { userDataLoaded } = this.props
    const { updatingSubscription = false, user } = this.state
    const subscriptions = user ? user.subscriptions : []
    const activeSubscription = subscriptions.find(s => s.status === 'active')
    const subscription = activeSubscription || subscriptions[0]
    const { payment_method: paymentMethod } = subscription || {}
    const autoRenew = Boolean(user && activeSubscription)
    const entitlement = fetchEntitlement(user, config.subscriberEntitlementName)
    const cardDisplayName = paymentMethod ?
      `${config.monthlyProductPrice} billed monthly to ${paymentMethod.display_name} exp ${paymentMethod.expiration_month}/${paymentMethod.expiration_year}` : ''
    const subscriptionCycle = entitlement && entitlement.end ?
      `Subscription ${autoRenew ? 'renews' : 'ends'} on ${moment(entitlement.end).format("dddd, MMMM Do YYYY")}` : ''

    if (!user) return <Redirect to={'/'} />
    else return <div id="pay">
      <Loader show={updatingSubscription || !userDataLoaded} text="updating" />
      <Menu />
      <div className="contents" style={{
        maxWidth: 720,
        margin: 'auto',
      }}>
        <h1>Account Settings</h1>
        <h3>User Profile</h3>
        <Table>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Name</Table.Cell>
              <Table.Cell>{ user.name }</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Email</Table.Cell>
              <Table.Cell>{ user.email }</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>

        <div style={{ display: config.usePaywall ? 'block' : 'none' }}>
          <h3>Subscription</h3>
          <Table>
            <Table.Body>
              <Table.Row>
                <Table.Cell>
                  Auto-Renew Monthly Subscription<br />
                  <i style={{ fontSize: '90%', color: '#666' }}>
                    {cardDisplayName}
                    <br />
                    <span style={{ color: autoRenew ? 'inherit' : 'Red' }}>
                      {subscriptionCycle}
                    </span>
                  </i>
                </Table.Cell>
                <Table.Cell>
                  OFF
                  <Checkbox toggle checked={autoRenew}
                    style={{ verticalAlign: 'middle', margin: '0 12px' }}
                    onClick={this.toggleAutoRenew} />
                  ON
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>Feedback</Table.Cell>
                <Table.Cell>
                  <a href={`mailto:${config.helpEmail}`}>Send Feedback</a>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div>

        {/* <h3>
          <span style={{
            color: config.themes.default.primaryColor,
            float: 'right',
            cursor: 'pointer',
            fontSize: '90%',
          }}
          onClick={() => { this.setState({ showAddCard: true }) }}>
            <Icon name="add" />
            add card
          </span>
          Saved Credit Cards
        </h3>
        <Stripe id="payment"
          fetchUser={fetchUser}
          showAddCard={this.state.showAddCard}
          user={user}
          toggleShowAddCard={this.toggleShowAddCard.bind(this)} /> */}
      </div>
    </div>
  }
}
