import React, { Component } from 'react'
import { injectStripe } from 'react-stripe-elements'
import { Icon, Input } from 'semantic-ui-react'

// components
import CardForm from './CardForm'

// helpers
import api from '../../helpers/api'
import { subscriptionProduct, subscriptionPricingPlan } from '../../config'

// images and styles
import '../../assets/css/components/CheckoutForm.css'

class CheckoutForm extends Component {
  handleSubmit = (ev) => {
    ev.preventDefault() // prevent page refresh

    const { fetchUser } = this.props

    const name = this.refs.addCardForm.name.value
    // Within the context of `Elements`, this call to createToken knows which Element to
    // tokenize, since there's only one in this group.
    this.props.stripe.createToken({name}).then(async ({token}) => {
      if (token) {
        // LocalStorage.Stripe.addSavedCard( token.card )
        // document.location.reload()
        const response = await api.submitPaymentMethodToken({
          name: `Stripe/${token.id}`,
          payment_provider_record: token,
        }).catch(() => null)
        if (response) {
         const subscribeToBugCatcher =  await api.subscribeToBugCatcher({
            product : subscriptionProduct,
            pricing_plan : subscriptionPricingPlan,
            payment_method : `Stripe/${token.id}`
          })
          if (subscribeToBugCatcher) await fetchUser(true)
        }
      }
    })
  }

  render() {
    const { showAddCard, toggleShowAddCard } = this.props
    return (
      <form ref={'addCardForm'} className="add-card" 
        style={{ display: showAddCard ? 'block' : 'none' }}
        onSubmit={this.handleSubmit}>
        <h3>
          <Icon name="close"
            style={{ float: 'right', cursor: 'pointer' }}
            onClick={toggleShowAddCard} />
          Add Card
        </h3>
        <div style={{ margin: '9px 0' }}>
          <Input placeholder={'Name on card'}
            name="name"
            icon={'user'}
            iconPosition={'left'}
            style={{
              marginLeft: -12,
              fontSize: '18px',
              width: '100%',
            }}
          />
        </div>
        <CardForm />
        <br />
        <button className="btn">Save Card</button>
      </form>
    );
  }
}

export default injectStripe(CheckoutForm)
