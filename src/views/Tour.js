import React, { Component } from 'react'
import { Link } from 'react-router-dom'

// components
import Menu from '../components/Menu'
import StlButton from '../components/StlButton'

// styles, images & files
import '../assets/css/Tour.css'
import resultsPdf from '../assets/sample-results.pdf'
import shot1 from '../assets/images/results_screenshot-1.jpg'
import shot2 from '../assets/images/results_screenshot-2.jpg'

export default class Tour extends Component {
  render() {
    return <div className={`theme`}>
      <Menu />
      <section id="tools" className="contents">
        <div className="tools-box">
          <h1>BugCatcher Tour</h1>

          <StlButton semantic primary href={resultsPdf}
            style={{float: 'right'}}>Open Results PDF</StlButton>
          <h3>See the Sample Results</h3>
          <p className="results-shots">
            <a href={resultsPdf}>
              <img src={shot1} alt="Results 1" />
              <img src={shot2} alt="Results 2" />
            </a>
          </p>
          <hr />
          
          <h3>See BugCatcher In Action!</h3>
          <p><iframe width="100%" height="420" src="https://www.youtube.com/embed/ScU5AKZp7_Q?rel=0" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></p>
          <hr />

          <h3>Additional Information</h3>
          <p>For more information about the tools used and languages supported, please visit our <Link to={'/tests'} onClick={() => {window.scrollTo({top: 0})}}>Tests</Link> page.</p>
        </div>
      </section>
    </div>
  }
}
