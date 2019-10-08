import axios from 'axios'
import octokit from './octokit'
import { github } from '../config'

let token

/**
 * @dev Sets a new token for use in this file and in octokit.js
 * 
 * @param {string} newToken 
 * @returns newToken
 */
function setToken(newToken) {
  // set our local token variable
  token = newToken
  // set the token in octokit helper
  octokit.setToken(newToken)

  return newToken
}

/**
 * @title GET Access Token
 * @dev Use the temporary code to retrieve an Access Token
 * 
 * @param {string} code Temporary code retrieved through OAuth flow
 * @returns {string} Access token
 */
async function getAccessToken(code) {
  const env = process.env.REACT_APP_FTL_ENV
  const getToken = await axios.get(`${github.backend}?code=${code}&env=${env}`)
  const { data: accessToken } = getToken
  return setToken(accessToken)
}

/**
 * @returns List of repositories the user has explicit permission (:read, :write, or :admin) to access.
 */
async function getRepos() {
  const { data: repos } = await get('/user/repos')
  return repos.map(r => r.full_name)
}

/**
 * @dev Get the contents of a repo on a specified branch or master (default)
 * 
 * @param {string} repo Full name of repo (ex: "your-org/your-project")
 * @param {string} ref The name of the commit/branch/tag. (Default:  master)
 * 
 * @returns {array(object(...fileInfo))}
 */
async function getRepoContents(repo, ref) {
  const { data: contents } = await get(`/repos/${repo}/contents/${ref}`)
  return contents.map(c => c)
}

/** @dev Promises resolving to javascript objects */
function get(path, options) {
  let headers
  if (options && options.headers) headers = options.headers
  return axios.get(`${github.dotComUri}${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      ...headers
    }
  })
}

export default {
  ...octokit,
  getAccessToken,
  getRepos,
  getRepoContents,
}

