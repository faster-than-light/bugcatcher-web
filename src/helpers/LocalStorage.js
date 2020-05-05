const jsonFromLS = (_key) => window.localStorage ? JSON.parse(window.localStorage.getItem(_key)) : null

class Annotations {

  static clearStorage = () => window.localStorage.setItem('annotations', JSON.stringify({}))

  static getAllAnnotations = () => jsonFromLS('annotations') || {}

  static getAnnotation = (project, testId) => this.getAllAnnotations()[project] ? this.getAllAnnotations()[project][testId] : null

  static getProjectAnnotations = (project) => this.getAllAnnotations()[project]

  static saveAnnotation(project, testId, annotation) {
    /** @todo Remove Project from storage object if no annotations remain */
    if (window.localStorage) {
      const annotations = this.getAllAnnotations()
      if (!annotations[project]) annotations[project] = {}
      annotations[project][testId] = annotation
      window.localStorage.setItem('annotations', JSON.stringify(annotations))
    }
  }
}

class BulkTestingQueue {

  static async clearStorage() {
    await this.setTestingQueue()
  }

  /* Testing Queue */
  static getTestingQueue() {
    return jsonFromLS('testingQueue') || []
  }
  static setTestingQueue(queue) {
    queue = Array.isArray(queue) ? queue.filter( (item, i, ar) => ar.indexOf(item) === i ) : []
    if (window.localStorage) {
      window.localStorage.setItem('testingQueue', JSON.stringify(queue))
    }
  }
}

class ProjectTestResults {

  static async clearStorage() {
    await this.setStlIds()
  }

  /* STLID */
  static getIds(project) {
    const sids = jsonFromLS('projectStlIds') || {}
    return project ? sids[project] || [] : sids
  }
  static setIds(project, sids) {
    sids = Array.isArray(sids) ? sids.filter( (item, i, ar) => ar.indexOf(item) === i ) : null
    if (window.localStorage) {
      let projectStlIds = this.getIds()
      if (!sids) delete projectStlIds[project]
      else projectStlIds[project] = sids
      window.localStorage.setItem('projectStlIds', JSON.stringify(projectStlIds))
    }
  }
  static pruneProjects(projects) {
    if (window.localStorage) {
      const projectStlIds = this.getIds()
      const projectNames = Object.entries(projectStlIds).map(p => p[0])
      const prunedNames = projectNames.filter(p => projects.includes(p))
      let prunedProjectStlIds = {}
      Object.entries(projectStlIds).forEach(([k, v]) => {
        if (prunedNames.includes(k)) prunedProjectStlIds[k] = v
      })
      window.localStorage.setItem(
        'projectStlIds',
        JSON.stringify(prunedProjectStlIds)
      )
    }
  }
}

class Stripe {

  static async clearStorage() {
    await this.setSavedCards()
  }

  /* STLID */
  static getSavedCards() {
    return this.storedStripeCards()
  }
  static setSavedCards(savedCards) {
    savedCards = Array.isArray(savedCards) ? savedCards.filter( (item, i, ar) => ar.indexOf(item) === i ) : []
    if (window.localStorage) window.localStorage.setItem('savedCards', JSON.stringify(savedCards))
  }
  static addSavedCard(savedCard) {
    if (!savedCard) return false
    const savedCards = this.storedStripeCards().concat(savedCard).filter( (item, i, ar) => ar.indexOf(item) === i )
    if (window.localStorage) window.localStorage.setItem('savedCards', JSON.stringify(savedCards))
  }
  static removeSavedCard(savedCard) {
    if (!savedCard) return false
    const savedCards = this.storedStripeCards().filter(c => c.id !== savedCard.id)
    if (window.localStorage) window.localStorage.setItem('savedCards', JSON.stringify(savedCards))
  }
  static storedStripeCards() {
    return window.localStorage && Array.isArray(JSON.parse(window.localStorage.getItem('savedCards'))) ?
      JSON.parse(window.localStorage.getItem('savedCards')) : []
  }

}

class User {

  static async clearStorage() {
    await this.setUser()
  }

  /* User */
  static getUser() {
    const user = window.localStorage.getItem('user')
    return user && user.length ? JSON.parse(user) : null
  }
  static setUser(user) {
    if (window.localStorage) window.localStorage.setItem('user', JSON.stringify(user || {}))
  }

}

export default {
  Annotations,
  BulkTestingQueue,
  ProjectTestResults,
  Stripe,
  User,
}
