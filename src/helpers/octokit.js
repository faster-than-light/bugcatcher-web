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


export default {
  setToken,
  getAuthenticated,
}