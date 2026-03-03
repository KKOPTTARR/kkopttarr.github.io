export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function showFlash(flashRef, msg, ms = 1800) {
  flashRef.value = msg
  setTimeout(() => { flashRef.value = '' }, ms)
}
