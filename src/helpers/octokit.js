const Octokit = require("@octokit/rest")

let token
let octokit = new Octokit(token)


function setToken(t) {
  token = t
  octokit = new Octokit({
    auth() {
      return `token ${token}`
    }
  })
}

function getToken() { return token }

async function getAuthenticated() {
  const { data } = await octokit.users.getAuthenticated()
  return data
}

/**
 * 
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} tree_sha 
 * @param {boolean} recursive 
 */
async function getTree(owner, repo, tree_sha, recursive) {
  recursive = recursive ? 1 : 0
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha,
    recursive,
  })
  return data
}

/**
 * 
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} file_sha 
 */
async function getBlob(owner, repo, file_sha) {
  const { data } = await octokit.git.getBlob({
    owner,
    repo,
    file_sha,
  })
  return data
}

async function getBranches(owner, repo) {
  const listBranches = await octokit.repos.listBranches({
    owner,
    repo
  }).catch(() => null)
  if (!listBranches) return
  else return listBranches['data']
}

const createBlob = (options) => { return octokit.git.createBlob(options) }

/**
 * @options
 * {
    owner,
    repo,
    message,
    tree, // The SHA of the tree object this commit points to
    parents, // The SHAs of the commits that were the parents of this commit. If omitted or empty, the commit will be written as a root commit. For a single parent, an array of one SHA should be provided; for a merge commit, an array of more than one should be provided.
  }
 */
const createCommit = (options) => { return octokit.git.createCommit(options) }

const createFork = (options) => { return octokit.repos.createFork(options) }

const createTree = (options) => { return octokit.git.createTree(options) }

const createRef = (options) => { return octokit.git.createRef(options) }

const updateRef = (options) => { return octokit.git.updateRef(options) }

const createPullRequest = (options) => { return octokit.pulls.create(options) }

export default {
  createBlob,
  createCommit,
  createFork,
  createPullRequest,
  createRef,
  createTree,
  getAuthenticated,
  getBlob,
  getBranches,
  getToken,
  getTree,
  octokit,
  setToken,
  updateRef,
}