import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'

const useStyles = makeStyles({
  card: {
    minWidth: 275,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 11,
  },
  pos: {
    marginBottom: 12,
  },
})

export default function FtlCard(props) {
  const { cardText, children, header, subheader } = props
  const classes = useStyles()
  const bull = <span className={classes.bullet}>•</span>

  return (
    <Card className={classes.card}>
      <CardContent>
        <Typography className={classes.title} color="textSecondary" gutterBottom>
          {header}
        </Typography>
        <Typography className={classes.subtitle} color="textSecondary" gutterBottom>
          {subheader}
        </Typography>
        {children}
      </CardContent>
    </Card>
  )
}