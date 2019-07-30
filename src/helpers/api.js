import BugCatcher from 'bugcatcher-api'
import { apiUrl } from '../config'
import { setCookie } from './cookies'
import mockResults from './mockResults.json'

// init api package constructor with options
const api = BugCatcher(apiUrl)

export default {
  ...api,
  setSid: (sid) => {
    setCookie("STL-SID", sid)
    api.setSid(sid)
  },
  getTestResult: (options) => {
    if (options.stub) return new Promise(r => r({ data: mockResults }))
    else return api.getTestResult(options)
  },
}
