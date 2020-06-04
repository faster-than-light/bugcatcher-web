// libraries
import React, { Component } from 'react'
import {
  Document,
  Image,
  Link,
  Page,
  PDFViewer,
  Text,
  View,
} from '@react-pdf/renderer'
import queryString from 'query-string'
import moment from 'moment'

// components
import FtlLoader from '../../components/Loader'

// helpers
import { appUrl } from '../../config'
import { getCookie } from '../../helpers/cookies'
import api from '../../helpers/api'
import CqcApi from '../../helpers/cqcApi'
import { decodedRepoName, testStatusToColor } from '../../helpers/strings'
import { groupedResultsJson } from '../../helpers/data'

// context
import { UserContext } from '../../contexts/UserContext'

// assets
import bugCatcherLogo from '../../assets/images/bugcatcher.png'
import ftlLogo from '../../assets/images/logo-1-line-black-text.png'
import { colors, styles } from './styles'

// constants
const cqcApi = CqcApi(getCookie("session"))

export default class ResultsPDF extends Component {
  static contextType = UserContext
  state = {}

  async componentWillMount() {
    document.body.classList.add("pdf-results")
    await this.fetchAndSaveResults()
  }

  async componentWillUnmount() {
    document.body.classList.remove("pdf-results")
  }

  async fetchAndSaveResults() {
    // set credentials for helper libraries
    await api.setSid( getCookie("session") )
    await cqcApi.setSid( getCookie("session") )

    // fetch the user object
    const user = await this.context.actions.fetchUser()

    // determine where to fetch data based on some querystring parameters
    const qs = queryString.parse(document.location.search)
    const scan = qs['scan']
    const test = qs['test']

    // fetch the results
    let results, tree
    if (scan) {
      // fetch from proxy server
      let { testResults, tree: gitTree } = await cqcApi.getWebhookScan(scan)
        .catch(c => { console.error(c); return ({}) })
      results = testResults
      tree = gitTree
    }
    else if (test) {
      // fetch from BugCatcher API
      const { data: resultsData } = await api.getTestResult({ 
        stlid: test,
        format: 'json',
      }).catch(c => { console.error(c); return ({}) })
      results = resultsData
    }

    // parse out `codes` from tests and the project name from both types of results
    const { test_run: testRun = {} } = results || {}
    const { codes, project: projectData = {} } = testRun
    const { name: projectName } = projectData
    const project = decodedRepoName(projectName) || 'not found'

    this.setState({
      codes,
      results,
      project,
      scan,
      test,
      tree,
      user,
    })
  }

  render() {
    const {
      results,
      project,
      scan,
      test,
    } = this.state

    if (!results) return <FtlLoader />

    const {
      test_run: testRun = {},
      test_run_result: testRunResult = [],
    } = results

    // const status = testRun.status_msg
    // const color = testStatusToColor(status)
    const startTest = moment(testRun.start)
    // const endTest = moment(testRun.end)
    let languagesUsed = testRunResult.find(t => t['test_suite_test']['test_suite']['language'])['test_suite_test']['test_suite']['language']
    let testToolsUsed = testRunResult.find(t => t['test_suite_test']['test_suite']['name'])['test_suite_test']['test_suite']['name']

    let [groupedResults, certified] = groupedResultsJson(testRunResult, project)

    const GroupedResults = () => {
      if (!groupedResults.length) return <Text style={{ color: colors.green }}>Passing all tests!</Text>
      else return groupedResults.map((r, i) => {
        let { annotation, resources } = r
        resources = resources.map((r, i) => <Link key={i} src={r} style={{ color: colors.lightBlue }}>{r}</Link>)

        const Instances = () => {
          const instances = r.location.map((l, _key) => {
            const filename = l[0]
            const commentary = l[1] !== 'None' ? l[1] : null
            return <View style={[]} key={`instance_${_key}`}>
              <Text style={[]} key={`instance_text_1_${_key}`}>
                {filename}
              </Text>
              <Text style={[]} key={`instance_text_2_${_key}`}>
                {commentary}
              </Text>
            </View>
          })
          return <View key={`instances_${i}`}>{instances}</View>
        }
        
        // result table (one for each issue)
        return <View wrap={false} style={[styles.table, styles.padded]} key={`issue${i}a`}>
          <View style={[styles.row]} key={`issue${i}b`}>
            <Text style={[
              styles.cell,
              styles.labelCell,
              styles.noBorder,
              styles.severityText,
              styles[`severityColor_${r['severity']}`],
              { textAlign: 'center' }
            ]} key={`issue${i}c`}>{r['severity'] + (r['severity'] !== 'info' ? ' impact' : '')}</Text>
            <Text style={[
              styles.cell,
              styles.wideCell,
              styles.severityBorder,
              styles[`lightSeverityColor_${r['severity']}`],
            ]} key={`issue${i}d`}>{r['title']}</Text>
          </View>
          <View style={[]} key={`issue${i}h`}>
            <Text style={[
              {
                borderTop: '1px solid #eaeaea',
                borderRight: '1px solid #ddd',
                borderBottom: '1px solid #ddd',
                borderLeft: '1px solid #ddd',
                paddingTop: 9,
                paddingRight: 9,
                paddingBottom: 3,
                paddingLeft: 9,
                lineHeight: 1.7,
              }
            ]}>{r['description']}</Text>
          </View>
          {
            !annotation ? null : <View style={[styles.row]} key={`issue${i}e`}>
                <Text style={[styles.cell, styles.labelCell]} key={`issue${i}f`}>Notes</Text>
                <Text style={[styles.cell, styles.wideCell, { color: '#8b0000' }]} key={`issue${i}g`}>{annotation}</Text>
            </View>
          }
          <View style={[styles.row]} key={`issue${i}n`}>
            <Text style={[styles.cell, styles.labelCell]} key={`issue${i}i`}>Instances</Text>
            <View style={[styles.cell, styles.wideCell]} key={`issue${i}j`}>
              <Instances />
            </View>
          </View>
          {
            !resources || !resources.length ? null : <View style={[styles.row]} key={`issue${i}k`}>
              <Text style={[styles.cell, styles.labelCell]} key={`issue${i}l`}>Resources</Text>
              <Text style={[styles.cell, styles.wideCell]} key={`issue${i}m`}>{resources}</Text>
            </View>
          }
        </View>
      })
    }

    return <PDFViewer style={{ width: '100vw', height: '100vh' }}>
      <Document key={'doc1'}>
        <Page size="A4" wrap style={styles.page} key={'page1'}>
          <View style={styles.body} key={'viewA1'}>
            <View style={styles.section} key={'viewB1'}>
              <Image style={styles.bugcatcherLogo} src={bugCatcherLogo} key={'image1'} />
              <Image style={styles.ftlLogo} src={ftlLogo} key={'image2'} />
            </View>
            <View style={styles.divider} key={'viewB2'} />

            <View style={[styles.row, styles.padded, { fontSize: 18, marginBottom: 0 }]} key={'viewB3'}>
              <Text style={{ flexShrink: 3 }} key={'text1d'}>Project: </Text>
              <Link src={`${appUrl}/project/${encodeURIComponent(project)}`} style={[styles.projectTitle, { flexGrow: 3 }]} key={'text2d'}>{project}</Link>
            </View>
            
            <View style={[styles.padded, { paddingTop: 0 }]} key={'viewB4'}>
              <View style={styles.table} key={'viewC1'}>
                <View style={[styles.row, { borderTop: '1px solid #ddd' }]} key={'viewD1'}>
                    <Text style={[styles.cell, styles.labelCell]} key={'text1a'}>Test ID</Text>
                    <Text style={[styles.cell, styles.wideCell]} key={'text1b'}>{scan || test}</Text>
                </View>
                <View style={[styles.row]} key={'viewD2'}>
                  <Text style={[styles.cell, styles.labelCell]} key={'text2a'}>Test Initiated</Text>
                  <Text style={[styles.cell, styles.wideCell]} key={'text2b'}>{startTest.format('llll')}</Text>
                </View>
                <View style={[styles.row]} key={'viewD3'}>
                  <Text style={[styles.cell, styles.labelCell]} key={'text3a'}>Languages Tested</Text>
                  <View style={[styles.cell, styles.wideCell, { padding: '6px 0 0 6px' }]} key={'text3b'}>
                    <Text style={styles.pill} key={'text1e'}>{languagesUsed}</Text>
                  </View>
                </View>
                <View style={[styles.row]} key={'viewD4'}>
                  <Text style={[styles.cell, styles.labelCell]} key={'text4a'}>Tools Used</Text>
                  <View style={[styles.cell, styles.wideCell, { padding: '6px 0 0 6px' }]} key={'text4b'}>
                    <Text style={[styles.pill, styles.pillSecondary]} key={'text2e'}>{testToolsUsed}</Text>
                  </View>
                </View>
                <View style={[styles.row]} key={'viewD5'}>
                  <Text style={[styles.cell, styles.labelCell]} key={'text5a'}>Files Tested</Text>
                  <View style={[styles.cell, styles.wideCell, { padding: '6px 0 0 6px' }]} key={'text5b'}>
                  <Link src={`${appUrl}/project/${encodeURIComponent(project)}#Files`} key={'text3d'}
                    style={{
                      color: colors.lightBlue,
                    }}>show {results.test_run.codes.length} files</Link>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.padded, {
              fontSize: 18,
              textAlign: 'left',
              paddingBottom: 0,
            }]} key={'viewB5'}>
              <Text key={'text1c'}>Results:</Text>
            </View>
            <GroupedResults key={`issues`} />
          </View>
        </Page>
      </Document>
    </PDFViewer>
  }
}
