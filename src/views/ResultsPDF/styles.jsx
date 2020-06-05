import { StyleSheet } from '@react-pdf/renderer'

import { themes } from '../../config'

const green = '#21ba45'
const lightGreen = '#d6f5dd'
const yellow = '#fbbd45'
const lightYellow = '#fdf5e3'
const orange = '#f2711c'
const lightOrange = '#fbebe1'
const red = '#db2828'
const lightRed = '#f7e2e1'
const lightBlue = themes['default']['primaryColor']
const gold = themes['default']['secondaryColor']
const colors = {
  green,
  lightGreen,
  yellow,
  lightYellow,
  orange,
  lightOrange,
  red,
  lightRed,
  lightBlue,
  gold,
}

const styles = StyleSheet.create({

  page: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    // flexDirection: "column",
    // padding: 25,
  },

  body: {
    flexGrow: 1,
    fontSize: 12,
  },

  // table elements
  table: {
    fontSize: 10,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignContent: "stretch",
    flexWrap: "nowrap",
    alignItems: "stretch",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    alignContent: "stretch",
    flexWrap: "nowrap",
    alignItems: "stretch",
    flexGrow: 0,
    flexShrink: 0,
    // flexBasis: 35,
    flexBasis: "auto",
    // marginBottom: -5,
  },
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    alignSelf: "stretch",
    padding: '9px',
    borderRight: '1px solid #ddd',
    borderBottom: '1px solid #ddd',
    // borderTop: '1px solid #ddd',
    borderLeft: '1px solid #ddd',
  },
  wideCell: {
    width: '75%',
    borderLeft: 0,
    marginLeft: -1,
  },
  labelCell: {
    backgroundColor: "#eee",
    width: '25%',
  },

  // view styles
  noBorder: {
    border: 0,
  },
  padded: {
    padding: 18,
  },
  paddedTopBottom: {
    padding: '9px 0',
  },
  section: {
    margin: 6,
    padding: 6,
  },
  divider: {
    width: '94%',
    height: 3,
    marginLeft: '3%',
    backgroundColor: lightBlue,
    borderBottom: `1px solid #ddd`,
  },
  marginSides: {
    marginLeft: 18,
    marginBottom: 18,
    marginRight: 18,
    paddingBottom: 9,
    borderBottom: '1px solid #ccc',
  },

  // images
  bugcatcherLogo: {
    width: 276,
    height: 65,
  },
  ftlLogo: {
    width: 180,
    height: 33,
    marginTop: 21,
    marginRight: 9,
    right: 0,
    position: 'absolute',
  },

  // text
  projectTitle: {
    color: lightBlue,
  },
  severityText: {
    borderTopLeftRadius: 6,
    color: '#fff',
  },
  severityColor_info: {
    backgroundColor: green,
  },
  severityColor_low: {
    backgroundColor: yellow,
  },
  severityColor_medium: {
    backgroundColor: orange,
  },
  severityColor_high: {
    backgroundColor: red,
  },
  issueDescription: {
    fontWeight: 'bold',
  },
  lightSeverityColor_info: {
    backgroundColor: lightGreen,
    borderLeft: `1px solid ${green}`,
  },
  lightSeverityColor_low: {
    backgroundColor: lightYellow,
    borderLeft: `1px solid ${yellow}`,
  },
  lightSeverityColor_medium: {
    backgroundColor: lightOrange,
    borderLeft: `1px solid ${lightOrange}`,
  },
  lightSeverityColor_high: {
    backgroundColor: lightRed,
    borderLeft: `1px solid ${red}`,
  },
  severityBorder: {
    borderTop: 0,
    borderRight: 0,
    borderBottom: 0,
  },
  pill: {
    borderRadius: 3,
    backgroundColor: lightBlue,
    color: '#fff',
    width: 72,
    textAlign: 'center',
    padding: 3,
    fontSize: 9,
  },
  pillSecondary: {
    backgroundColor: gold,
    color: '#000',
  },
})

export { colors, styles }