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
        className={props.className + ' btn'}
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
      if (subscribeToBugCatcher) {
        await fetchUser(true)
        alert('redirect to welcome view')
      }
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
        className={'bottom'}
        buttonText={'Get BugCatcher Pro'}
        actionName={'User Signup'}
        setUser={showStripe} />
    </React.Fragment>
    else if (user && user.isSubscriber) return <h4 style={{margin:0}}>You are a BugCatcher Pro User!</h4>
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
        <button id="stripe_button" className={'btn bottom'}
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
        className={'bottom'}
        buttonText={'Use BugCatcher Free'}
        actionName={'User Signup'}
        setUser={setUser} />
    </React.Fragment>
    else if (user && user.isSubscriber) return <h4>You are a BugCatcher Pro User!</h4>
    else if (user) return <h4 style={{margin:0}}>You are using BugCatcher Free!</h4>
  }
  
  render() {
    const { user = {email: ''} } = this.props
    const proButton = user.isSubscriber ? <this.proButton {...this.props} /> :
      <React.Fragment>
        <this.proButton {...this.props} />
      </React.Fragment>

    return <div className={`theme`}>
      <Menu />
      <div className="contents">
        <section id="pricing">
          <div style={{marginTop: 21 }}>
            <p style={{textAlign: 'center'}}><img src={logo} style={{ width: 360 }} /></p>
            <div style={{ height: 18 }} />

            <div className="white-block">
              <h2>Free BugCatcher!</h2>
              <div className="block-content">
                <h3>We will offer 4X speeds for free.
                  <br />Great for for developers, open source projects and students.</h3>
                <p>We&apos;re very close to launch! You&apos;re welcome to use this beta version and we&apos;d love to hear from you. Send feedback to <a href="mailto:help@fasterthanlight.dev">help@fasterthanlight.dev</a></p>
                <this.freeButton {...this.props} />
              </div>
            </div>

            <div className="white-block">
              <h2>BugCatcher Pro</h2>
              <div className="block-content">
                <h3>10X speeds<br />
                  $19.99/month<br />
                  Free until January 1, 2020</h3>
                <p>We&apos;re offering a (very big) discount to the first 50 customers who pre-register. Pro includes up to 5 licenses, for you and your team. We plan to charge around $249/month for Pro in 2020.</p>
                {proButton}
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  }
}
