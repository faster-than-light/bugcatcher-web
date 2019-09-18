import React, { Component } from 'react'
import { GoogleLogin } from 'react-google-login'
import StripeCheckout from 'react-stripe-checkout'
import Popup from 'react-popup'

// components
import Loader from '../components/Loader'
import Menu from '../components/Menu'

// helpers
import { setCookie } from '../helpers/cookies'
import config from '../config'
import api from '../helpers/api'
import { version } from '../../package.json'

// images & styles
import logoShield from '../assets/images/bugcatcher-shield.png'
import logo from '../assets/images/bugcatcher-transparent.png'
import '../assets/css/Pricing.css'

export default class Pricing extends Component {
  state = {
    savingPaymentMethod: false,
  }

  componentWillUnmount() {
    this.setState({ openStripeTimeout: null })
  }

  savingPaymentMethod(saving) {
    this.setState({ savingPaymentMethod: saving })
  }

  Login = (props) => {
    const { actionName, buttonText, setUser, style } = props
    const { fetchUser } = this.props
    return <React.Fragment>
      <GoogleLogin
        clientId={config.googleLoginId}
        buttonText={buttonText}
        onSuccess={async response => {
          setCookie('tokenId', response.tokenId)
          const { data: fetchedUser } = await api.getSid({
            token: response.tokenId
          })
          const { data: fetchedUserData } = await api.getUserData({
            sid: fetchedUser.sid
          })
          setUser({ ...fetchedUserData, sid: fetchedUser.sid })
          window.mixpanel.identify(fetchedUser.email)
          window.mixpanel.people.set(
            {
              "$email": fetchedUser.email,
              "$name": fetchedUser.name,
              version,
            }
          )
          window.mixpanel.track(actionName, {
            "$email": fetchedUser.email,
            version,
          })
          fetchUser()
          this.setState({ openWidget: true })
        }}
        onFailure={e => {
          console.error(e)
          setUser(null)
          alert('There was an error logging into Google.')
          this.setState({ loggingIn: false })
        }}
        onRequest={() => {
          this.setState({ loggingIn: true })
        }}
        className={'btn'}
        style={style}
      />
    </React.Fragment>
  }

  openStripe = (ref, shouldShowStripe) => {
    if (ref && shouldShowStripe && document.getElementById('stripe_button'))
      document.getElementById('stripe_button').click()
  }

  onToken = async (token) => {
    const { fetchUser } = this.props
    this.savingPaymentMethod(true)
    const response = await api.submitPaymentMethodToken({
      name: `Stripe/${token.id}`,
      payment_provider_record: token,
    }).catch(() => null)
    if (response) {
      const subscription = config.productSubscriptions.find(s => s.product === 'BugCatcher Enterprise')
      const subscribeToBugCatcher =  await api.subscribeToBugCatcher({
        product : subscription.product,
        pricing_plan : subscription.pricingPlan,
        payment_method : `Stripe/${token.id}`
      })
      if (subscribeToBugCatcher) await fetchUser(true)
      else Popup.alert('There was a network error, you were not subscribed')
    } 
    else Popup.alert('There was a network error, your payment was not proccessed')
  }

  proButton = props => {
    const { setUser, user } = props
    const showStripe = args => {
      setUser(args)
      this.setState({
        shouldShowStripe: true,
        openStripeTimeout: setTimeout(
          () => { this.openStripe(true, true) },
          1500
        )
      })
    }
    const subscription = config.productSubscriptions.find(s => s.product === 'BugCatcher Pro')
    if (!user || !user.sid) return <React.Fragment>
      <this.Login
        buttonText={'Get BugCatcher Pro'}
        actionName={'User Signup'}
        setUser={showStripe} />
    </React.Fragment>
    else if (user && user.isSubscriber) return <h4>You are a BugCatcher Pro User!</h4>
    else return <React.Fragment>
      <Loader show={this.state.savingPaymentMethod} />
      <StripeCheckout
        name={subscription.product} // the pop-in header title
        description={subscription.description} // the pop-in header subtitle
        panelLabel={subscription.product} // prepended to the amount in the bottom pay button
        amount={subscription.priceInCents}
        savingPaymentMethod={this.savingPaymentMethod.bind(this)}
        allowRememberMe={false}
        token={this.onToken}
        stripeKey={config.stripePublicKey}
        currency="USD"
        email={user.email}
        image={logoShield} // the pop-in header image (default none)
        closed={() => {}}
        {...this.props}
      >
        <button id="stripe_button" className={'btn'}
          ref={this.openStripe}>
          {'Subscribe to BugCatcher Pro'}
        </button>
      </StripeCheckout>
    </React.Fragment>
  }

  freeButton = props => {
    const { setUser, user } = props
    if (!user || !user.sid) return <React.Fragment>
      <this.Login
        buttonText={'Use BugCatcher Free'}
        actionName={'User Signup'}
        setUser={setUser} />
    </React.Fragment>
    else if (user && user.isSubscriber) return <h4>You are a BugCatcher Pro User!</h4>
    else if (user) return <h4>You are using BugCatcher Free!</h4>
  }
  
  render() {
    const { user = {email: ''} } = this.props
    const proButton = user.isSubscriber ? <this.proButton {...this.props} /> :
      <React.Fragment>
        <this.proButton {...this.props} />
        <span style={{paddingLeft: 21}}>$29.99 / month</span>
      </React.Fragment>

    return <div className={`theme`}>
      <Menu />
      <div className="contents">
        <section id="pricing">
          <div style={{marginTop: 21}}>
            <img src={logo} style={{ float: 'right', width: 210 }} />
            <h1>BugCatcher Pricing</h1>
            <div style={{ height: 18 }} />

            <div className="white-block">
              <h3>Free BugCatcher!</h3>
              <div className="block-content">
                <p>Praesent imperdiet orci eu commodo suscipit. Aliquam sed sodales sem. Curabitur pellentesque mi at dolor iaculis tincidunt. Integer sed neque et nunc ultricies congue. Fusce id justo ac odio hendrerit blandit ac vitae metus. Fusce eleifend scelerisque imperdiet.</p>
                <this.freeButton {...this.props} />
              </div>
            </div>

            <div className="white-block">
              <h3>BugCatcher Pro</h3>
              <div className="block-content">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas viverra mauris ac aliquet placerat. Aenean at velit eleifend, viverra dui vitae, egestas lacus. Mauris justo ex, laoreet et aliquam sed, euismod at ipsum. </p>
                {proButton}
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  }
}
