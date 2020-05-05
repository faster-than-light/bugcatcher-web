import React from 'react'
import { Link } from 'react-router-dom'

import { helpEmail } from '../../config'

const emailLink = <a href={`mailto:${helpEmail}`}>{helpEmail}</a>

export default [
  {
    q: `How do I report a bug?`,
    a: <p>Please send all bug reports to {emailLink}.</p>
  },
  {
    q: `What static analysis tests do you offer?`,
    a: <React.Fragment>
      <p>We currently offer testing for Python code via Bandit and Java code via FindBugs. Up next, we&apos;re integrating testing for Android development. Please visit the <Link to="/tests">Tests page</Link> for more information.</p>
      <p>We&apos;re figuring out the rest of our roadmap based on customer requests! If you&apos;d like to see us include tests for your favorite language (or the one you use the most, not necessarily your favorite) drop us a line at {emailLink}.</p>
    </React.Fragment>
  },
  {
    q: `How is the Faster Than Light SaaS tool different from other static analysis tools?`,
    a: <React.Fragment>
      <p>We&apos;ve found that open source static analysis tooling is an amazing resource but that it can be difficult and time consuming to set up and configure. We&apos;re making it simpler and easier to use these open source tools. Even some proprietary enterprise tools can be time consuming to set up, or may be out of reach for individual developers. Faster Than Light is quick to set up, simple to use, and priced to be affordable for most developers.</p>
      <p>There&apos;s a lot more that we plan to do over the next several months. Down the road, we plan to use a combination of machine learning and simple configuration tools to reduce the noise that you get when running these tests.</p>
      <p>We&apos;ve also built an advanced backend (based on Docker) which makes it super fast to parallelize your tests. This makes the biggest difference for enterprise customers with a large codebase, but we could all use more speed.</p>
    </React.Fragment>
  },
  {
    q: `How do I cancel my account?`,
    a: <p>You can turn off auto-renewal easily in the Settings. You can also choose to cancel and request a refund for your most recent payment at any time for any reason. That said, we&apos;d rather you stay! If you are unhappy or would like to see improvements, let us know at {emailLink}. A member of the founding team will read your email, and we&apos;ll usually reply the same day.</p>
  }
]