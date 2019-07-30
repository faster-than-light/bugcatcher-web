import { subscriberEntitlementName } from '../config'

export const fetchEntitlement = (user, entitlement) => (
  user && user.entitlements && user.entitlements.find(
    s => s.entitlement_name === entitlement &&
      new Date(s.end) > new Date()
  )
)

export const isSubscriber = user => Boolean(
  fetchEntitlement(user, subscriberEntitlementName)
)
