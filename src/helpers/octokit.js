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

async function getBranches(owner, repo) {
  const { data } = await octokit.repos.listBranches({
    owner,
    repo
  })
  return data
}


export default {
  setToken,
  getAuthenticated,
  getBranches,
  getTree,
}