import React from 'react'
import { Form } from 'semantic-ui-react'

// components
import StlButton from './StlButton'

// helpers
import api from '../helpers/api'

//styles
import '../assets/css/components/CustomerInfoForm.css'

export default class CustomerInfoForm extends React.Component {
  constructor () {
    super ()
    this.state = {
      customerInfoFormData: null,
      showContactForm: true,
      working: false
    }
    this.ContactForm = this.ContactForm.bind(this)
    this.ThankYou = this.ThankYou.bind(this)
  }

  ContactForm = () => {
    if (!this.state.showContactForm || this.state.customerInfoFormData) return null
    else return <div style={this.props.style}>
      <h2 className="center-text primary-color">Request Beta Access</h2>
      <Form id="customer_info_form">
        <Form.Field>
          <label>Name (required)</label>
          <input ref={r => this.customerName = r} type="text" name="name" placeholder="Please enter your Name" required />
        </Form.Field>
        <Form.Field>
          <label>Email (required)</label>
          <input ref={r => this.customerEmail = r} type="email" name="email" placeholder="Please enter your Email Address" required />
        </Form.Field>
        <Form.Field>
          <label>Phone (optional)</label>
          <input ref={r => this.customerPhone = r} type="tel" pattern=".{0}|^[0-9]+$" name="phone" placeholder="Please enter your Phone Number" />
        </Form.Field>
        <Form.Field>
          <label>Company Name (optional)</label>
          <input ref={r => this.customerCompany = r} type="text" name="company" placeholder="Please enter your Company Name" />
        </Form.Field>
        <Form.Field>
          <label>I require a self-hosted version</label>
          <label style={{ margin: '12px 6px', fontSize: 18, width: '47%', display: 'inline-block' }}>
            <input ref={r => this.interestedInSelfHosted = r} type="radio" required name="interestedInSelfHosted" value={true} />
            &nbsp; Yes
          </label>
          <label style={{ margin: '12px 6px', fontSize: 18, width: '47%', display: 'inline-block' }}>
            <input ref={r => this.notInterestedInSelfHosted = r} type="radio" required name="interestedInSelfHosted" value={false} />
            &nbsp; No
          </label>
        </Form.Field>
        <Form.Field>
          <label>Other Info (optional)</label>
          <textarea ref={r => this.customerMessage = r} name="message" placeholder="Please type a message" />
        </Form.Field>
        <StlButton
          semantic
          floated="left"
          onClick={() => {this.props.closeTrigger()}}
          >Cancel</StlButton>
        <StlButton type="submit"
          semantic
          floated="right"
          className={this.state.working ? 'btn working' : 'btn primary'}
          onClick={async () => {
            if (
              !this.customerName.value ||
              !this.customerEmail.value,
              // @todo: validate email format
              (!this.interestedInSelfHosted.checked && !this.notInterestedInSelfHosted.checked)
            ) return false
            this.setState({working: true})
            const customerInfoFormData = {
              name: this.customerName.value,
              email: this.customerEmail.value,
              phone: this.customerPhone.value,
              company: this.customerCompany.value,
              message: this.customerMessage.value,
              product: this.props.name,
              interested_in_self_hosted: this.interestedInSelfHosted.checked
            }
            await api.addLead(customerInfoFormData)
            this.setState({ customerInfoFormData, showContactForm: false, working: false })
          }}>{this.state.working ? 'sending...' : 'Submit'}</StlButton>
      </Form>
    </div>
  }
  
  ThankYou = () => {
    if (this.state.showContactForm || !this.state.customerInfoFormData) return null
    else return <div style={{textAlign: 'center'}}>
      <h2>Thank You</h2>
      <p style={{
        fontSize: 'large',
        color: 'white'
      }}>Thank you for applying to join the {this.props.name} beta! We&apos;ll be in touch very soon (usually within 48 hours) to follow up.</p>
      <button className="btn secondary" onClick={() => {this.props.closeTrigger()}}>close</button>
    </div>
  }
  
  render() {
    return (
      <div>
        <this.ContactForm />
        <this.ThankYou />
      </div>
    )
  }
}
