import axios from 'axios'
import { cqcApiUrl } from '../config'

export default {

  getResults: (stlid) => {
    return get(`/results/${stlid}`)
  },

  putResults: (results) => {
    return put('/results', results)
  },

  // getPDF: (stlid) => {
  //   return get(`/pdf/${stlid}`)
  // },

  // putPDF: (data) => {
  //   return put('/pdf', data)
  // },

  getJobsQueue: async (user) => {
    const jobs = await get(`/jobs/${user.sid}`)
    return jobs
  },

  putJobsQueue: async (data) => {
    const { data: jobs } = await put(`/jobs`, data)
    return jobs
  },

  deleteJobsQueueItems: async (data) => {
    const { data: response } = await del(`/jobs`, data)
    return response
  },

  postPullRequestUrl: async (data) => {
    return post(`/pr`, data)
  },

}

/** @return Promises resolving to javascript objects */
async function get(endpoint, options) {
  let headers
  if (options && options.headers) headers = options.headers
  return axios.get(cqcApiUrl + endpoint, {
    ...options,
    ...headers
  })
}
async function post(endpoint, data) {
  return axios.post(cqcApiUrl + endpoint, data, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
async function put(endpoint, data) {
  return axios.put(cqcApiUrl + endpoint, data, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
async function del(endpoint, data) {
  return axios.delete(cqcApiUrl + endpoint, {
    data,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
