import React, { Component } from 'react'
import MailchimpSubscribe from 'react-mailchimp-subscribe'
import config from '../config'

// images and styles
import '../assets/css/components/Subscribe.css'

// basic form
const CustomForm = ({ status, message, onValidated }) => {
  let email, fname, lname
  const submit = () => onValidated({
    EMAIL: email.value,
    FNAME: fname.value,
    LNAME: lname.value,
  })

  return (
    <div className="subscribe">
      <div>
        <div>
          <input placeholder={'First name (optional)'}
            ref={node => (fname = node)}
            type="text"
          />
          <input placeholder={'Last name (optional)'}
            ref={node => (lname = node)}
            type="text"
          />
        </div>

        <div>
          <input placeholder={'Email Address (required)'}
            required
            ref={node => (email = node)}
            type="email"
            style={{ border: status === 'error' ? '1px solid Red' : 'none' }}
          />
          <span style={{
            position: 'absolute',
            marginLeft: -24,
            fontSize: '2rem',
            fontWeight: 500,
            lineHeight: '2.5rem',
            display: status === 'error' ? 'inline-block' : 'none',
            color: 'Red',
          }}>*</span>
          <button className={'btn grey-bg-color'}
            onClick={submit}>
            Subscribe
          </button>
        </div>

        {/* AJAX Status messages */}
        <div className="status-message">
          {status === "sending" && <div style={{ color: config.secondaryColor }}>sending...</div>}
          {status === "error" && (
            <div
              style={{ color: "#a94442", backgroundColor: '#f2dede', border: '1px solid #ebcccc' }}
              dangerouslySetInnerHTML={{ __html: message.replace("0 - ", '') }}
            />
          )}
          {status === "success" && (
            <div
              style={{ color: "#3c763d", backgroundColor: '#dff0d8', border: '1px solid #d0e9c6' }}
              dangerouslySetInnerHTML={{ __html: message }}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default class Subscribe extends Component {
  render() {
    const url =
      "https://sohotokenlabs.us19.list-manage.com/subscribe/post?u=5ab64f1e30494af6c10c92f55&id=208b2b428b";
    if (this.props.user) return null
    else return (
      <div>
        <hr style={{ borderColor: '#333', margin: '24px auto 21px auto', width: '90%' }} />
        <h3 style={{ margin: 0, color: '#fff' }}>Join the Mailing List</h3>
        <MailchimpSubscribe
          url={url}
          render={({ subscribe, status, message }) => (
            <CustomForm
              status={status}
              message={message}
              onValidated={formData => subscribe(formData)}
            />
          )}
        />
      </div>
    );
  }
}
