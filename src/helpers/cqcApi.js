import axios from 'axios'
import { cqcApiUrl } from '../config'

export default function(ftlSID) {

  const getSid = () => {
    return ftlSID
  }

  const setSid = (sid) => {
    ftlSID = sid
  }

  const getResults = (stlid) => {
    return get(`/results/${stlid}`)
  }

  const putResults = (results) => {
    return put('/results', results)
  }

  const getJobsQueue = async (user) => {
    if (!user) return
    const jobs = await get(`/jobs/${user.sid}`)
    return jobs
  }

  const putJobsQueue = async (data) => {
    const { data: jobs } = await put(`/jobs`, data)
    return jobs
  }

  const deleteJobsQueueItems = async (data) => {
    const { data: response } = await del(`/jobs`, data)
    return response
  }

  const postPullRequestUrl = async (data) => {
    return post(`/pr`, data)
  }

  const getWebhookSubscriptions = async (user) => {
    if (!user) return
    const { data: getWebhookSubscriptions } = await get(`/webhook/subscriptions/github/${process.env.REACT_APP_FTL_ENV === 'development' ? 'staging' : process.env.REACT_APP_FTL_ENV}`)
    return getWebhookSubscriptions
  }

  const getWebhookScan = async (scan) => {
    const { data: getWebhookScan } = await get(`/webhook/scan/github/${scan}`)
    return getWebhookScan
  }

  /** @return Promises resolving to javascript objects */
  async function get(endpoint, options) {
    let headers
    if (options && options.headers) headers = options.headers
    return axios.get(cqcApiUrl + endpoint, {
      ...options,
      headers: {
        'FTL-SID': getSid(),
        ...headers
      }
    })
  }
  async function post(endpoint, data) {
    return axios.post(cqcApiUrl + endpoint, data, {
      headers: {
        'FTL-SID': ftlSID,
        'Content-Type': 'application/json',
      }
    })
  }
  async function put(endpoint, data) {
    return axios.put(cqcApiUrl + endpoint, data, {
      headers: {
        'FTL-SID': ftlSID,
        'Content-Type': 'application/json',
      }
    })
  }
  async function del(endpoint, data) {
    return axios.delete(cqcApiUrl + endpoint, {
      data,
      headers: {
        'FTL-SID': ftlSID,
        'Content-Type': 'application/json',
      }
    })
  }

  return {
    setSid,
    getResults,
    putResults,
    getJobsQueue,
    putJobsQueue,
    deleteJobsQueueItems,
    postPullRequestUrl,
    getWebhookSubscriptions,
    getWebhookScan,
  }

}
