export function dayKey(value, timezone = 'Australia/Sydney') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:timezone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
