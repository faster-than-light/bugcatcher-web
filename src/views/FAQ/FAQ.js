import React, { Component } from 'react'
import { Accordion, Icon } from 'semantic-ui-react'

// components
import Menu from '../../components/Menu'

// helpers
import faqs from './faqs'

// images & styles
import '../../assets/css/FAQ.css'

export default class FAQ extends Component {
  state = {}

  handleClick = (e, titleProps) => {
    const { index } = titleProps
    const { activeIndex } = this.state
    const newIndex = activeIndex === index ? -1 : index

    this.setState({ activeIndex: newIndex })
  }

  render() {
    const { activeIndex } = this.state
    const Faqs = () => faqs.map((f, i) => <React.Fragment>
      <Accordion.Title active={activeIndex === i} index={i}
        className="faq-q"
        onClick={this.handleClick}>
        <Icon name='dropdown' />
        {f.q}
      </Accordion.Title>
      <Accordion.Content active={activeIndex === i}
        className="faq-a">
        {f.a}
      </Accordion.Content>
    </React.Fragment>)
    
    return <div className={`theme`}>
      <Menu />
      <div className="contents">
        <section id="faq">
          <div className="faq-box">
            <h1>BugCatcher FAQs</h1>
            <br />
            <Accordion>
              <Faqs />
            </Accordion>
          </div>
        </section>
      </div>
    </div>
  }
}
