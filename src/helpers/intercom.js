import { intercomAppId } from '../config'
import { getCookie } from '../helpers/cookies'

export const init = (user) => {
  console.log('initializing Intercom')

  // Intercom settings
  window.intercomSettings = { app_id: intercomAppId }
  if (user) window.intercomSettings = {
    ...window.intercomSettings,
    name: user.name,
    email: user.email
  }
  
  // Initialize Intercom script
  var w=window
  var ic=w.Intercom
  if (typeof ic==="function") {
    ic('reattach_activator')
    ic('update',w.intercomSettings)
  } else {
    var d=document
    var i=function(){i.c(arguments)}
    i.q=[]
    i.c=function(args){i.q.push(args)}
    w.Intercom=i
    var l=function() {
      var s=d.createElement('script')
      s.type='text/javascript'
      s.async=true
      s.src='https://widget.intercom.io/widget/' + intercomAppId
      var x=d.getElementsByTagName('script')[0]
      x.parentNode.insertBefore(s,x)
    }
    if (w.attachEvent) w.attachEvent('onload',l)
    else w.addEventListener('load',l,false)
  }
  
  // Hide widget if cookies agreement is not true
  if (getCookie("cookies-accepted")) setTimeout( showWidget, 3000 )
}

export const hideWidget = () => {
  const div = document.getElementById('intercom-container')
  if (div) div.style.display = 'none'
}

export const showWidget = () => {
  const div = document.getElementById('intercom-container')
  if (div) div.style.display = 'block'
}
