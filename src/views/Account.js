import React, { Component } from 'react'
import { Link, Redirect } from 'react-router-dom'
import { Checkbox, Icon, Table } from 'semantic-ui-react'
import moment from 'moment'

// components
import Menu from '../components/Menu'
import Loader from '../components/Loader'
// import StlButton from '../components/StlButton'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import api from '../helpers/api'
import config from '../config'
import { getCookie, setCookie } from '../helpers/cookies'
import { fetchEntitlement } from '../helpers/data'

export default class Account extends Component {
  static contextType = UserContext
  state = {
    cookiesAccepted: getCookie("cookies-permitted")
  }

  componentWillMount() {
    console.log(this.props)
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
    const { userDataLoaded, user } = this.props
    // const { updatingSubscription = false } = this.state

    // const { subscriptions = [] } = user
    // const activeSubscription = subscriptions.find(s => s.status === 'active')
    // const subscription = activeSubscription || subscriptions[0]
    // const { payment_method: paymentMethod } = subscription || {}
    // const autoRenew = Boolean(user && activeSubscription)
    // const entitlement = fetchEntitlement(user, config.subscriberEntitlementName)
    // const cardDisplayName = paymentMethod ?
    //   `${config.monthlyProductPrice} billed monthly to ${paymentMethod.display_name} exp ${paymentMethod.expiration_month}/${paymentMethod.expiration_year}` : ''
    // const subscriptionCycle = entitlement && entitlement.end ?
    //   `Subscription ${autoRenew ? 'renews' : 'ends'} on ${moment(entitlement.end).format("dddd, MMMM Do YYYY")}` : ''

    if (!user && userDataLoaded) document.location.href = '/'
    if (!user) return null
    
    
    return <div id="pay">
      <Loader show={
        // updatingSubscription ||
        !userDataLoaded
      } text="updating" />
      <Menu />
      <div className="contents" style={{
        maxWidth: 720,
        margin: 'auto',
        paddingBottom: 90,
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

        {/* <div style={{ display: config.usePaywall && user.isSubscriber ? 'block' : 'none' }}>
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
        </div> */}

        {/* <br />
        <div style={{ display: config.usePaywall && !user.isSubscriber ? 'block' : 'none' }}>
          <h3>Subscription</h3>
          <Table>
            <Table.Body>
              <Table.Row>
                <Table.Cell>
                  <p>
                    You are currently using BugCatcher Developer.
                    <br /><StlButton semantic disabled className="default">Developer Level User</StlButton>
                  </p>
                  <hr />
                  <p>
                    Upgrade to BugCatcher Pro for only {config.monthlyProductPrice} a month.
                  </p>
                  <p><Link to={'/pricing'}><StlButton>Upgrade to BugCatcher Pro</StlButton></Link></p>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div> */}

        <br />
        <div style={{ display: this.state.cookiesAccepted ? 'block' : 'none' }}>
          <h3>Privacy</h3>
          <Table>
            <Table.Body>
              <Table.Row>
                <Table.Cell>
                  <p>Cookies and IP addresses allow us to deliver and improve our web content, resolve technical errors, and provide you with a personalized experience. Our website uses cookies and collects your IP address for these purposes.</p>
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>
                  <p>
                      Faster Than Light may use cookies and my IP address to
                      collect individual statistics in order to help diagnose
                      software errors and improve user experience in accordance 
                      with our <a href="https://fasterthanlight.dev/privacy" target="_blank">Privacy Policy</a> and the <a href="https://fasterthanlight.dev/terms" target="_blank">Terms of Use</a>. 
                  </p>
                  <a href="#" onClick={this.context.actions.logOut}
                    style={{ float: 'right' }}>I revoke my consent</a>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div>
      </div>
    </div>
  }
}
