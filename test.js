let i = setInterval(
  () => { console.log(Date.now()) },
  300
)
console.log(i)

setTimeout(
  () => {
    clearInterval(i)
    console.log(i)
  },
  3000
)