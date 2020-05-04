import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import { GoogleLogout } from 'react-google-login'

// context
import { UserContext } from '../contexts/UserContext'

// helpers
import { ftlWebUrl, usePaywall } from '../config'
import { version } from '../../package.json'

// import api from '../helpers/api'
import { getCookie } from '../helpers/cookies';

// images and styles
import logoOnly from '../assets/images/logo-only.png'
import '../assets/css/components/Menu.css'

class NavLinks extends Component {
  render() {
    return <ul className={'nav-links navbar-nav mr-auto mt-2 mt-lg-0'}>
      <li className="nav-item"><Link to={'/tests'}>Tests</Link></li>
      <li className="nav-item"><Link to={'/faq'}>FAQ</Link></li>
      <li className="nav-item"><a href={`${ftlWebUrl}/contact`}>Feedback</a></li>
    </ul>
  }
}

class Welcome extends Component {
  render() {
    const { user } = this.props
    const greeting = `Welcome, ${user ? user.name : 'guest'}!`
    return <span {...this.props}>
      {
        user ? <Link to="/account">{greeting}</Link>
          : <span>{greeting} &nbsp;<Link to="/">log in</Link></span>
      }
    </span>
  }
}

export default class Menu extends Component {
  componentWillMount() {
    this.setState({ theme: getCookie("theme") })
  }

  render() {
    const { showMobileMenu } = this.state

    const Avatar = props => {
      return <img {...props} alt="" className="avatar" />
    }

    return (
      <nav id="ftl_navbar"
        className={`navbar navbar-expand-lg navbar-light bg-light ftl-menu${showMobileMenu ? ' mobile-menu' : ''}`}
        {...this.props}>
        <Link className="navbar-brand home-link" to={`/`}>
          <img src={logoOnly} alt="Faster Than Light" /> <span className="logo-text">Faster Than Light</span>
        </Link>
        <button className="navbar-toggler"
          onClick={() => {
            setTimeout(
              () => { this.setState({ showMobileMenu: !showMobileMenu }) },
              showMobileMenu ? 333 : 0
            )
          }}
          type="button"
          data-toggle="collapse"
          data-target="#ftlNavbarToggleTop"
          aria-controls="ftlNavbarToggleTop"
          aria-expanded="false"
          aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="ftlNavbarToggleTop">
          <NavLinks />
          <div className="log-in-out">
            <UserContext.Consumer>
              {(context) => {
                const { user } = context.state
                const { setUser } = context.actions
                if (user) return <React.Fragment>
                  <Avatar className={'avatar'} src={user.picture_link} />
                  <Welcome to={'/account'} user={user} />
                  <button style={{
                    marginLeft: 9,
                  }}
                  className="link"
                  onClick={() =>{
                    // window.mixpanel.track('Log Out', { version })
                    setUser(null)
                    // this.logoutButton.signOut()
                    setTimeout(
                      () => window.location.reload(),
                      999
                    )
                  }}>log out</button>
                  {/* <GoogleLogout
                    buttonText="log out"
                    className={'link'}
                    id="google_login"
                    ref={r => this.logoutButton = r}
                    style={{
                      visibility: 'hidden',
                      position: 'absolute',
                    }}
                  /> */}
                </React.Fragment>
                else return <React.Fragment>
                  <Welcome />
                  <div id="signin">
                  </div>
                </React.Fragment>
              }}
            </UserContext.Consumer>
          </div>
        </div>
      </nav>
    )
  }
}
