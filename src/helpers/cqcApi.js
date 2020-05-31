import axios from 'axios'

// helpers
import { appEnvironment, cqcApiUrl } from '../config'

export default function(ftlSID) {

  const setSid = (sid) => {
    ftlSID = sid
  }

  const getJwt = async (sid) => {
    if (global.fetchingAccessToken) return

    global.fetchingAccessToken = true
    ftlSID = sid
    const { data } = await get(`/jwt/${sid}`)
    console.log({data})
    global.fetchingAccessToken = false
  }

  const removeJwt = async () => {
    const { data } = await del(`/jwt`)
    console.log({data})
  }

  const getResults = (stlid) => {
    return get(`/results/${stlid}`)
  }

  const putResults = async (data) => {
    const {
      channel = 'github',
      environment = appEnvironment,
      scan,
      sid,
    } = data
    if (!data || !channel || !environment || !scan || !sid) return
  
    const subscription = await post(`/results/${channel}/${environment}`, {
      scan,
      sid,
    })
    return subscription['data']
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
    const { data: getWebhookSubscriptions } = await get(`/webhook/subscriptions/github/${appEnvironment}`)
    return getWebhookSubscriptions
  }

  const getWebhookScan = async (scan) => {
    const { data: getWebhookScan } = await get(`/webhook/scan/github/${scan}`)
    return getWebhookScan
  }

  const putWebhookSubscription = async (data) => {
    const {
      channel = 'github',
      environment = 'production',
      ref,
      repository,
    } = data
    if (!data || !channel || !environment || !ref || !repository) return
  
    const { data: subscription } = await post(`/webhook/subscription/${channel}/${environment}`, {
      ref,
      repository,
    })
    return subscription
  }

  const deleteWebhookSubscription = async (data) => {
    const {
      channel = 'github',
      environment = 'production',
      ref,
      repository,
    } = data
    if (!data || !channel || !environment || !ref || !repository) return
  
    const { data: deletedSubscription } = await del(`/webhook/subscription/${channel}/${environment}`, {
      ref,
      repository,
    })
    return deletedSubscription
  }

  /** @return Promises resolving to javascript objects */
  async function get(endpoint, options) {
    let headers
    if (options && options.headers) headers = options.headers
    return axios.get(`${cqcApiUrl}${endpoint}`, {
      ...options,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    })
  }
  async function post(endpoint, data) {
    return axios.post(cqcApiUrl + endpoint, data, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
  async function put(endpoint, data) {
    return axios.put(cqcApiUrl + endpoint, data, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
  async function del(endpoint, data) {
    return axios.delete(cqcApiUrl + endpoint, {
      data,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }

  return {
    deleteJobsQueueItems,
    deleteWebhookSubscription,
    getJobsQueue,
    getJwt,
    getResults,
    getWebhookScan,
    getWebhookSubscriptions,
    putJobsQueue,
    postPullRequestUrl,
    putResults,
    putWebhookSubscription,
    removeJwt,
    setSid,
  }

}
