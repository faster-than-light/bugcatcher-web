import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import clsx from 'clsx'
import Card from '@material-ui/core/Card'
import CardHeader from '@material-ui/core/CardHeader'
import CardContent from '@material-ui/core/CardContent'
import CardActions from '@material-ui/core/CardActions'
import Collapse from '@material-ui/core/Collapse'
import Avatar from '@material-ui/core/Avatar'
import IconButton from '@material-ui/core/IconButton'
import CheckIcon from '@material-ui/icons/Check'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import MoreHorizIcon from '@material-ui/icons/MoreHoriz'

const useStyles = makeStyles(theme => ({
  card: {
    backgroundColor: 'var(--color-background-offset)',
    width: '100%',
    margin: '18px auto',
  },
  header: {
    backgroundColor: '#ddd',
    color: 'var(--color-dark-text)',
  },
  avatar: {
    backgroundColor: 'var(--color-background-offset)',
    color: 'var(--color-primary)'
  },
  content: {
    // backgroundColor: 'var(--color-background-offset)',
    // color: 'var(--color-dark-text)',
    // width: '100%',
  },
}))

export default function FtlCardDashboard(props) {
  const { cardText, children, header, subheader } = props
  const classes = useStyles()
  const [expanded, setExpanded] = React.useState(false)

  let { buttons } = props
  if (!Array.isArray(buttons)) buttons = [buttons]
  const actionButtons = buttons.map(b => <IconButton>{b}</IconButton>)

  const handleExpandClick = () => {
    setExpanded(!expanded)
  }

  return (
    <Card className={classes.card}>
      <CardHeader className={classes.header}
        avatar={
          <Avatar aria-label="option" className={classes.avatar}>
            <CheckIcon />
          </Avatar>
        }
        title={<h3>{header}</h3>}
        subheader={<h4 className={classes.header}>{subheader}</h4>}
      />
      <CardContent className={classes.content}>
        <IconButton
          className={clsx(classes.expand, {
            [classes.expandOpen]: expanded,
          })}
          style={{float: 'right'}}
          onClick={handleExpandClick}
          aria-expanded={expanded}
          aria-label="show more"
        >
          <MoreHorizIcon />
        </IconButton>
        {cardText}
      </CardContent>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent className={classes.content}>
          {children}
        </CardContent>
      </Collapse>
      <CardActions className={[classes.content, classes.cardActions]}>
        {actionButtons}
      </CardActions>
    </Card>
  );
}