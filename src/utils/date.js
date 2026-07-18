// Local calendar date as YYYY-MM-DD. `Date#toISOString` converts to UTC first,
// which rolls over to the next day while it's still "today" for anyone west
// of Greenwich (e.g. 21:20 in Argentina, UTC-3, is already past midnight UTC)
// — always read the date from local getters instead.
export function todayStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
