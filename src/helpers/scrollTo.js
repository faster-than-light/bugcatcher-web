export function scrollTo(elementId, quiet, verticalAdjustment) {
  const element = document.getElementById(elementId)
  const bodyRect = document.body.getBoundingClientRect(),
    elemRect = element.getBoundingClientRect(),
    offset   = elemRect.top - bodyRect.top;
  window.scrollTo({
    top: offset - (verticalAdjustment || 0),
    left: 0,
    behavior: 'smooth'
  })
  if (!quiet) setTimeout(() => {
    document.location.hash = '#' + elementId
  }, 900)
}
