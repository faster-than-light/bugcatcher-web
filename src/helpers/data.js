import { subscriberEntitlementName } from '../config'
import { severities } from './strings'

export const fetchEntitlement = (user, entitlement) => (
  user && user.entitlements && user.entitlements.find(
    s => s.entitlement_name === entitlement &&
      new Date(s.end) > new Date()
  )
)

export const isSubscriber = user => Boolean(
  fetchEntitlement(user, subscriberEntitlementName)
)

export const buildResultsMatrix = results => {
  let resultsMatrix = {
    low: 0,
    medium: 0,
    high: 0,
  }
  if (results && results.test_run_result) results.test_run_result.forEach(hit => {
    const test_suite_test = hit['test_suite_test']
    const ftl_severity = test_suite_test['ftl_severity']
    resultsMatrix[ftl_severity]++
  })
  return resultsMatrix
}

export const groupedResultsJson = (testRunResult, project) => {
  /**
   * @dev Arrange results into Grouped Rows
   */

  const sortRowsByFileLine = (a, b) =>
    String(a.code.name + a.start_line).localeCompare(
      String(b.code.name + b.start_line)
    )

  let certified = true

  const reducedResults = testRunResult.reduce((acc, item) => {
    const { test_suite_test: test } = item
    const { ftl_severity: severity } = test
    if (severity === 'high') certified = false
    acc[severity] = acc[severity] || []
    acc[severity].push(item)
    return acc
  }, {})
  severities.forEach(s => {
    if (!reducedResults[s]) reducedResults[s] = []
  })

  /** @dev Sort results */
  const titleReducer = (acc, item) => {
    const { test_suite_test: test } = item
    const { ftl_short_description: title } = test
    acc[title] = acc[title] || []
    acc[title].push(item)
    return acc
  }

  reducedResults.high = new Map(Object.entries(reducedResults.high.reduce(titleReducer, {}))) || []
  reducedResults.medium = new Map(Object.entries(reducedResults.medium.reduce(titleReducer, {}))) || []
  reducedResults.low = new Map(Object.entries(reducedResults.low.reduce(titleReducer, {}))) || []
  reducedResults.info = new Map(Object.entries(reducedResults.info.reduce(titleReducer, {}))) || []

  const descriptionReducer = (acc, item) => {
    const { test_suite_test: test } = item
    const { ftl_long_description: description } = test
    acc[description] = acc[description] || []
    acc[description].push(item)
    return acc
  }
  let groupedResults = {}
  Object.entries(reducedResults).forEach(r => {
    const key = r[0]
    const value = r[1]
    let m = new Map()
    Array.from(value).forEach(v => {
      m.set(v[0], v[1].reduce(descriptionReducer, {}))
    })
    groupedResults[key] = m
  })

  const groupedResultsArray = [].concat(
    groupedResults.high,
    groupedResults.medium,
    groupedResults.low,
    groupedResults.info
  )

  let rows = []
  groupedResultsArray.forEach((titlesGroup, i) => {
    const titles = Array.from(titlesGroup)
    if (titles && titles.length)
      titles.forEach(t => {
        const hits = Object.entries(t[1]).map(d => {
          return {
            project,
            testId: d[1][0]['test_suite_test']['ftl_test_id'],
            testResultId: d[1][0]['test_run_result_id'],
            annotation: d[1][0]['project_annotation'],
            severity: severities[i],
            title: t[0],
            description: d[0],
            location: d[1].sort(sortRowsByFileLine).map(f => ([
              `${f.code.name} (lines ${f.start_line} - ${f.end_line})`,
              f.commentary
            ])),
            resources: d[1].map(h =>
              typeof h.test_suite_test.more_information_uris === 'object' ?
              JSON.parse(
                h.test_suite_test.more_information_uris.replace(/'/g, '"')
              ) : []
            )[0],
          }
        })
        rows.push(hits)
      })
  })
  return [rows.flat(), certified]
}

