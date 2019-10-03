module.exports = {

  // app url
  appUrl: ({
    production: 'https://bugcatcher.fasterthanlight.dev',
    development: 'https://staging.tiger.sohotokenlabs.com',
    local: 'http://localhost:3000'
  })[process.env.REACT_APP_FTL_ENV],
  
  // company/sales site
  ftlWebUrl: process.env.REACT_APP_FTL_ENV === 'production' ?
    'https://fasterthanlight.dev' :
    'https://staging.fasterthanlight.dev'
  ,

  // support
  helpEmail: 'help@fasterthanlight.dev',

  // Intercom
  intercomAppId: 'reahimyu',

  // products
  productNames: {
    default: '',
    eth: 'Ethereum',
    java: 'Java',
    python: 'Python',
  },

  // subscriptions
  /**@todo:deprecate*/ subscriptionProduct: 'BugCatcher Enterprise',
  /**@todo:deprecate*/ subscriptionPricingPlan: 'bug_catcher_one_month_free_199_499',
  productSubscriptions: [
    {
      product: 'BugCatcher Free',
      pricingPlan: 'bug_catcher_free',
      priceInCents: 0,
    },
    {
      product: 'BugCatcher Pro',
      description: 'Special Pre-Reg Promo',
      pricingPlan: 'bug_catcher_pro',
      priceInCents: 1999,
    },
    {
      product: 'BugCatcher Enterprise',
      pricingPlan: 'bug_catcher_one_month_free_199_499',
      priceInCents: 15000,
    },
  ],

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

  // github oauth
  github: {
    enterpriseUri: 'http://github.at.home/api/v3',
    dotComUri: 'https://api.github.com',
    clientId: ({
      production: 'bf803b9cb69105c1c66f',
      development: '37647c8bd2536e298348',
      local: 'c7208e5474b2d9d81af3',
    })[process.env.REACT_APP_FTL_ENV]
  },
  
  // google oauth
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
