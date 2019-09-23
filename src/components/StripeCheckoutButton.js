import React from 'react'
import { Redirect } from 'react-router-dom'
import StripeCheckout from 'react-stripe-checkout'
import Popup from 'react-popup'

// helpers
import config from '../config'
import api from '../helpers/api'
// import LocalStorage from '../helpers/LocalStorage'

import logo from '../assets/images/bugcatcher-shield.png'

//styles
import '../assets/css/components/Popup.css'

export default class StripeCheckoutButton extends React.Component {
  state = {
    clickedStripeButton: false,
    redirectToThankYou: false,
  }

  _onToken = async (token) => {
    const { fetchUser, savingPaymentMethod } = this.props
    savingPaymentMethod(true)
    const response = await api.submitPaymentMethodToken({
      name: `Stripe/${token.id}`,
      payment_provider_record: token,
    }).catch(() => null)
    if (response) {
     const subscribeToBugCatcher =  await api.subscribeToBugCatcher({
        product : config.subscriptionProduct,
        pricing_plan : config.subscriptionPricingPlan,
        payment_method : `Stripe/${token.id}`
      })
      if (subscribeToBugCatcher) {
        this.setState({ redirectToThankYou: true })
        await fetchUser(true)
      }
      else Popup.alert('There was a network error, you were not subscribed')
    } 
    else Popup.alert('There was a network error, your payment was not proccessed')
  }

  _clicked = () => {
    if (this.props.user) this.stripeButton.click()
    else this.googleLoginButton.click()
  }

  popPaymentCard = ref => {
    setTimeout(
      () => {
        const { user } = this.props
        if (ref && !this.state.clickedStripeButton && user && !user.isSubscriber) {
          this.setState({ clickedStripeButton: true })
          ref.click()
        }    
      },
      333
    )
  }
  
  render() {
    const { redirectToThankYou } = this.state
    const { savingPaymentMethod, user } = this.props
    if (redirectToThankYou) return <Redirect to={'/thankyou'} />
    else return (
      <div style={{display: 'inline-block'}}>
        <StripeCheckout
          allowRememberMe={false}
          token={this._onToken}
          stripeKey={config.stripePublicKey}
          currency="USD"
          email={user.email}
          image={logo} // the pop-in header image (default none)
          closed={() => savingPaymentMethod(false)}
          {...this.props}
        >
          <button className={this.props.buttonClassName}
            ref={this.popPaymentCard}>
            {this.props.buttonText}
          </button>
        </StripeCheckout>
        <Popup/>
      </div>
    )
  }
}