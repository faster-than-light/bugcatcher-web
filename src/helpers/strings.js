module.exports = {
  appendS: (count) => count === 1 ? '' : 's',
  base64ToBlob: (data) => {
    const b64Data = data.replace('data:application/pdf;base64,','')
    const byteCharacters = atob(b64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], {type: 'application/pdf'})
  },
  severities: ["high", "medium", "low", "info"],
  severityToColor: (severity) => {
    switch (severity) {
      case "high": return 'red'
      case "medium": return 'orange'
      case "low": return 'yellow'
      default: case "info": return 'green'
    }
  },
  severitySortOrder: (severity) => {
    switch (severity) {
      case "high": return 1
      case "medium": return 2
      case "low": return 3
      default: return 4
    }
  },
  testStatusToColor: (status) => {
    switch (String(status).toLowerCase()) {
      case "complete": return 'blue'
      case "setup": return 'orange'
      case "running": return 'yellow'
      default: case "error": return 'red'
    }
  },
  cleanProjectName: (projectName) => {
    if (!projectName) return ''
    projectName = projectName.replace(/\//g, '_')
    const delims = ["<", ">", "#", "%", '"']
    const reserved = [";", "/", "?", ":", "@", "&", "=", "+", "$", ","]
    const unwise = ["{", "}", "|", "\\", "^", "[", "]", "`"]
    const forbidden = [
      ...delims,
      ...reserved,
      ...unwise,
    ]
    let cleanString = ''
    projectName.split('').map(a => a).forEach(a => {
      cleanString += !forbidden.includes(a) ? a : ''
    })
    return cleanString
  },
  noLeadingSlash: (s) => (s && s.substring(0, 1) === '/') ? s.substring(1) : s,
}