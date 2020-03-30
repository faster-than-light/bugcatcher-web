const Octokit = require("@octokit/rest").plugin(
  require("octokit-create-pull-request")
)

export default (options) => {
  let {
    owner,
    repo,
    resultsMarkdown,
    selectedBranch,
    token,
  } = options

  
  const octokit = new Octokit({
    auth: `token ${token}`
  });
  
  // Returns a normal Octokit PR response
  // See https://octokit.github.io/rest.js/#octokit-routes-pulls-create
  return octokit
    .createPullRequest({
      owner,
      repo,
      title: "BugCatcher Code Certification",
      body: "Your repository has passed BugCatcher's code certification process. Please merge this PR to include your test results as a markdown file.",
      base: selectedBranch,
      head: "bugcatcher-certification",
      changes: {
        files: {
          "BUGCATCHER_CERTIFIED.md": resultsMarkdown
        },
        commit: "Publish static analysis test results from BugCatcher"
      }
    })
    .then(pr => pr.data)

}