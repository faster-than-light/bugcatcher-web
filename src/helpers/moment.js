import moment from 'moment'

export function durationBreakdown(start, end) {
  const startTime = moment(start)
  const endTime = moment(end)
  const duration = moment.duration(endTime.diff(startTime))
  const hours = duration.hours()
  const minutes = duration.minutes()
  const seconds = duration.seconds()
  let elapsed = `${seconds} seconds`
  if (minutes) elapsed = `${minutes} minutes, ` + elapsed
  if (hours) elapsed = `${hours} hours, ` + elapsed
  return elapsed
}
