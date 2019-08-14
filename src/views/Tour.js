import React, { Component } from 'react'
import { Link } from 'react-router-dom'

// components
import Menu from '../components/Menu'
import StlButton from '../components/StlButton'

// external files
import resultsPdf from '../assets/sample-results.pdf'

export default class Tour extends Component {
  render() {
    return <div className={`theme`}>
      <Menu />
      <section id="tools" className="contents">
        <div className="tools-box">
          <h2>See the Sample Results</h2>
          <p>
            <StlButton semantic primary href={resultsPdf}>Open Results PDF</StlButton>
          </p>
          <hr />
          
          <h1>See BugCatcher In Action!</h1>
          <p><iframe width="100%" height="420" src="https://www.youtube.com/embed/5iocVVWZ4G0" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>

          <h3>Additional Information</h3>
          <p>For more information about the tools used and languages supported, please visit our <Link to={'/tests'} onClick={() => {window.scrollTo({top: 0})}}>Tests</Link> page.</p>
        </div>
      </section>
    </div>
  }
}
