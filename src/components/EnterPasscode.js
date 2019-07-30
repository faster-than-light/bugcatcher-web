import React from 'react'
import { Form } from 'semantic-ui-react'

// components
import StlButton from './StlButton'

// helpers
import { passCodes, passCodeFailureMessage } from '../config'
import { setCookie } from '../helpers/cookies';

//styles
// import '../assets/css/components/CustomerInfoForm.css'
// import { isNullOrUndefined } from 'util';

export default class EnterPasscode extends React.Component {
  constructor () {
    super ()
    this.PasscodeForm = this.PasscodeForm.bind(this)
  }

  PasscodeForm = () => {
    return <div className="black-bg" style={{ paddingTop: '9%', textAlign: 'center'}}>
      <h2 className="center-text" >Passcode Required</h2>
      <Form id="customer_info_form">
        <Form.Group>
          <input ref={r => this.passcode = r} type="password" name="passcode" placeholder="Please enter a passcode" required />
          <StlButton type="submit"
            style={{ minHeight: 40.3, marginLeft: 6 }}
            onClick={() => {
              const passcode = this.passcode.value.toLowerCase()
              const beta = passCodes.beta.includes(passcode)
              const mvp = passCodes.mvp.includes(passcode)
              if (!beta && !mvp) alert(passCodeFailureMessage)
              else {
                setCookie(
                  "accessGranted", 
                  mvp ? 'mvp' : beta ? 'beta' : '', 
                  0.25 // days
                )
                document.location.reload()
              }
            }}>Enter</StlButton>
        </Form.Group>        
      </Form>
    </div>
  }
  
  render() {
    return (
        <this.PasscodeForm />
      )
  }
}