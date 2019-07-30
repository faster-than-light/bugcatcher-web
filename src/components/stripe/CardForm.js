import React from 'react'
import { CardElement } from 'react-stripe-elements'

export default class CardForm extends React.Component {
  render() {
    return <div style={{
      opacity: 0.66,
    }}>
      <CardElement style={{
        base: {fontSize: '18px'},
      }} />
    </div>
  }
}
