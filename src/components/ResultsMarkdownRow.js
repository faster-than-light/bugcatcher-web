export default function ResultsMarkdownRow (props) {
  let {
    severity,
    title,
    description,
    location,
  } = props

  const instances = (() => {
    return location.map((l, _key) => {
      // console.log({ location: l })
      const filename = l[0]
      const commentary = l[1] !== 'None' ? l[1] : ''
      return `\n\t- ${filename} ${commentary}`
    }).join('')
  })()

  description = description && description === 'None' ? null : description

  return `(${String(severity).toUpperCase()}) \`${title}\` ${description} ${instances}`
}
