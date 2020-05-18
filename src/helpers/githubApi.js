import axios from 'axios'
import octokit from './octokit'
import { appEnvironment, github } from '../config'
import octokitCreatePullRequest from './octokitCreatePullRequest'

let token
function getToken() { return token }

/**
 * @dev Sets a new token for use in this file and in octokit.js
 * 
 * @param {string} newToken 
 * @returns newToken
 */
function setToken(newToken) {
  // set our local token variable
  token = newToken['token'] ? newToken['token'] : newToken
  // set the token in octokit helper
  octokit.setToken(token)

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
  const getToken = await axios.get(`${github.backend}?code=${code}&env=${appEnvironment}`)
  const { data: accessToken } = getToken
  return setToken(accessToken)
}

/**
 * @returns List of repositories the user has explicit permission (:read, :write, or :admin) to access.
 */
async function getRepos(sort, direction) {
  const { data: repos } = await get(`/user/repos?sort=${sort}&direction=${direction}`)
  return repos.map(r => r)
}

async function getBranch(owner, repo, branch) {
  const { data } = await get(`/repos/${owner}/${repo}/branches/${branch}`)
  return data
}

/**
 * @dev Get the contents of a repo on a specified branch or master (default)
 * 
 * @param {string} repo Full name of repo (ex: "your-org/your-project")
 * @param {string} path The file path or directory of the contents
 * @param {string} ref The name of the commit/branch/tag. (Default:  master)
 * 
 * @returns {array(object(...fileInfo))}
 */
async function getRepoContents(repo, path, ref) {
  let uri = `/repos/${repo}/contents/`
  if (path) uri = uri + `${path}`
  if (ref) uri = uri + `?ref=${ref}`
  const { data: contents } = await get(uri)
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

const getTree = async (owner, repo, branchName) => {
  const branch = await getBranch(owner, repo, branchName)

  if (
    branch &&
    branch.commit &&
    branch.commit.commit &&
    branch.commit.commit.tree &&
    branch.commit.commit.tree.sha
  ) {
    const treeSha = branch['commit']['commit']['tree']['sha']
    const tree = await octokit.getTree(
      owner,
      repo,
      treeSha,
      true // recursive bool
    )
    return({ branchName, tree })
  }
}

const getTreeFromSha = async (options) => {
  const { owner, repo, sha } = options
    const tree = await octokit.getTree(
      owner,
      repo,
      sha,
      true // recursive bool
    )
    return tree
}

function createBlob(blob) {
  return octokit.git.createBlob(blob)
}

function getRef(ref) {
  return octokit.git.getRef(ref)
}

function createPullRequest(options) {
  options.token = token
  return octokitCreatePullRequest(options)
}

// async function makePullRequestFromResults(options) {
//   const BUGCATCHER_CERTIFIED_REF = `refs/heads/bugcatcher-certified`

//   let {
//     owner,
//     repo,
//     selectedBranch,
//     treeSha: commit_sha,
//   } = options

//   // 1. Create a fork
//   const fork = await octokit.createFork({
//     owner,
//     repo,
//   })
//   owner = fork.data.owner.login
//   repo = fork.data.name

//   // 2. Get base tree sha
//   const { data: commit } = await octokit.octokit.git.getCommit({
//     owner,
//     repo,
//     commit_sha,
//   })
//   const { tree } = commit
//   const { sha: treeSha } = tree

//   // 3. Create a blob
//   const { data: blob } = await octokit.createBlob({
//     owner,
//     repo,
//     content: window.atob('this is the test results markdown content'),
//     encoding: 'base64',
//   })
//   const { sha: blobSha } = blob

//   // 4. Create a tree with the blob as a new file
//   const { data: blobTree } = await octokit.createTree({
//     owner,
//     repo,
//     tree: [{
//       path: 'BUGCATCHER_CERTIFIED.md',
//       mode: "100644",
//       type: "blob",
//       sha: blobSha,
//     }],
//     base_tree: treeSha,
//   })
//   const { sha: blobTreeSha } = blobTree

//   // 5. Commit the new tree
//   const { data: newCommit } = await octokit.createCommit({
//     owner,
//     repo,
//     message: 'dynamic commit',
//     tree: blobTreeSha,
//     parents: [commit_sha],
//   })
//   const { sha: newCommitSha } = newCommit

//   // 6. Create a reference to point at new commit
//   const { data: createdRef } = await octokit.createRef({
//     repo,
//     owner,
//     ref: BUGCATCHER_CERTIFIED_REF,
//     sha: newCommitSha,
//   })

//   // 7. Create a pull request for this new commit
//   const { data: pullRequest } = await octokit.createPullRequest({
//     owner,
//     repo,
//     title: 'BugCatcher Certified Code',
//     head: BUGCATCHER_CERTIFIED_REF,
//     base: `refs/heads/${selectedBranch}`
//   })

//   return ({pullRequest})
// }

export default {
  ...octokit,
  createBlob,
  createPullRequest,
  getAccessToken,
  getBranch,
  getRef,
  getRepos,
  getRepoContents,
  getToken,
  getTree,
  getTreeFromSha,
  // makePullRequestFromResults,
  setToken,
}

