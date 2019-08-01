module.exports = {

  ftlWebUrl: process.env.NODE_ENV === 'production' ?
    'https://fasterthanlight.dev' :
    'https://staging.fasterthanlight.dev'
  ,

  // support
  helpEmail: 'help@fasterthanlight.dev',

  // products
  productNames: {
    default: '',
    eth: 'Ethereum',
    java: 'Java',
    python: 'Python',
  },

  // subscriptions
  subscriptionProduct: 'BugCatcher Enterprise',
  subscriptionPricingPlan: 'bug_catcher_one_month_free_199_499',

  // cookies alert
  showCookiesAlert: Boolean(process.env.REACT_APP_SHOW_COOKIES_ALERT) || process.env.REACT_APP_FTL_ENV !== 'production',

  // payments
  usePaywall: Boolean(process.env.REACT_APP_USE_PAYWALL) || process.env.REACT_APP_FTL_ENV !== 'production',
  monthlyProductPrice: '$19.99',
  subscriberEntitlementName: 'bug_catcher_subscriber',

  // backend
  apiUrl: process.env.REACT_APP_FTL_ENV === 'production' ?
    process.env.REACT_APP_PROD_API_URI :
      process.env.REACT_APP_FTL_ENV === 'bat' ?
        process.env.REACT_APP_BAT_API_URI :
          process.env.REACT_APP_STAGING_API_URI,

  // mixpanel
  mixpanelToken: process.env.REACT_APP_FTL_ENV === 'production' ?
    process.env.REACT_APP_PROD_MIXPANEL_TOKEN :
      process.env.REACT_APP_STAGING_MIXPANEL_TOKEN,

  // oauth
  googleLoginId: process.env.REACT_APP_GOOGLE_LOGIN_ID,

  // stripe
  // stripePublicKey: process.env.REACT_APP_STRIPE_KEY,
  stripePublicKey: process.env.REACT_APP_FTL_ENV === 'production' ?
    process.env.REACT_APP_PROD_STRIPE_KEY :
      process.env.REACT_APP_STAGING_STRIPE_KEY,

  // themes
  themes: {
    default: {
      primaryColor: '#3774a7',
      secondaryColor: '#ffd849',
    },
    eth: {
      primaryColor: '#ffab40',
      secondaryColor: '#00acc9',
    },
    java: {
      primaryColor: '#007396',
      secondaryColor: '#ed8b00',
    },
    python: {
      primaryColor: '#3774a7',
      secondaryColor: '#ffd849',
    }
  },

  // project management
  ignoreUploadDirectories: [
    'node_modules'
  ],

}
