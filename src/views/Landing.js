import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogin } from 'react-google-login'
import { Modal } from 'semantic-ui-react'

// components
import CustomerInfoForm from '../components/CustomerInfoForm'
import StripeCheckoutButton from '../components/StripeCheckoutButton'
import Loader from '../components/Loader'

// context & helpers
import { UserContext } from '../contexts/UserContext'
import { setCookie } from '../helpers/cookies'
import config from '../config'
import api from '../helpers/api'
import { version } from '../../package.json'

// images and styles
import '../assets/css/Home.css'
import bugCatcherLogo from '../assets/images/bugcatcher-white.png'
import StlButton from '../components/StlButton'

export default class Landing extends Component {
  constructor () {
    super()
    this.state = {
      openModal: false,
      loggingIn: false,
    }
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
        }}
        onFailure={e => {
          console.error(e)
          setUser(null)
          this.setState({ loggingIn: false })
        }}
        onRequest={() => {
          this.setState({ loggingIn: true })
        }}
        className={'btn big'}
        style={style}
      />
    </React.Fragment>

  }

  render() {
    const { cards, fetchUser, user } = this.props
    const linkStyle = {
      fontSize: '120%',
      paddingRight: 9,
      paddingLeft: 9,
    }

    return <div id="home" className={`${this.props.productCode}-theme theme`}>
      <div id="landing">
        <img src={bugCatcherLogo} alt="BugCatcher" style={{ width: '100%' }} />
        <p><a href="https://fasterthanlight.dev" target="_blank" style={{color: '#eaeaea'}}>Made by Faster Than Light</a></p>
        <div style={{ height: 21 }} />
        <div style={{ width: '100%' }}>
          <UserContext.Consumer>
            {(context) => {
              const { setUser } = context.actions
              if (!user) return <React.Fragment>
                <Loader show={this.state.loggingIn} text="logging in" />
                <div id="signin">
                  <this.Login
                    buttonText={'log in'}
                    actionName={'User Login'}
                    style={{ float:'left' }}
                    setUser={setUser} />
                  <Link to={'/pricing'}>
                    <StlButton
                      className="btn big"
                      style={{ marginLeft: 15 }}>sign up</StlButton>
                  </Link>
                </div>
                <p className="lead product-description" style={{color: '#eaeaea'}}>
                  BugCatcher is a fast, easy static analysis tool for your code.
                </p>
                <p>
                  <Link to="/tests" className="primary-color"
                    style={linkStyle}>Documentation</Link>
                  &nbsp;|&nbsp;
                  <Link to="/faq" className="primary-color"
                    style={linkStyle}>FAQ</Link>
                  &nbsp;|&nbsp;
                  <Link to="/tour" className="primary-color"
                    style={linkStyle}>Tour</Link>
                </p>
              </React.Fragment>
              else if (!user.isSubscriber) return <div style={{ paddingTop: 12 }}>
                <Loader show={this.state.savingPaymentMethod} />
                <StripeCheckoutButton
                  name="BugCatcher" // the pop-in header title
                  description={`First Month Free then ${config.monthlyProductPrice}/mo`} // the pop-in header subtitle
                  panelLabel="Get First Month Free!" // prepended to the amount in the bottom pay button
                  amount={15000}
                  buttonClassName={'btn big'}
                  buttonText={'Set Up Payment Method'}
                  user={user}
                  cards={cards}
                  savingPaymentMethod={this.savingPaymentMethod.bind(this)}
                  fetchUser={fetchUser}
                  setUser={setUser} />
                <br />
                <p className="lead product-description">
                  {`BugCatcher is ${config.monthlyProductPrice}/month. Your first month is free. Cancel anytime, get a refund for any reason.`}
                </p>
                <a onClick={async () => {
                    window.mixpanel.track('Log Out', { version })          
                    await setUser(null)
                    window.location.href = '/'
                  }}>log out</a>
              </div>
              else return null
            }}
          </UserContext.Consumer>
        </div>
        <Modal
          closeIcon
          onClose={() => this.setState({openModal:false})}
          open={this.state.openModal}
          style={{
            backgroundColor: 'Black',
            color: 'White'
          }}> 
          <CustomerInfoForm
            style={{ display: user ? 'none' : 'block' }}
            closeTrigger = { () => this.setState({openModal: false})}
            name="Ethereum BugCatcher" // the pop-in header title
            description={`First Month Free then ${config.monthlyProductPrice}/mo`} // the pop-in header subtitle
            panelLabel="Get First Month Free!" // prepended to the amount in the bottom pay button
            amount={15000}
            buttonClassName={'button-light grey-bg-color'}
            user={this.props.user}
            setUser={this.props.setUser} />
        </Modal>
      </div>
    </div>
  }
}
