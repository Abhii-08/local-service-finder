export function inSlot(slot, date) {
  const t = new Date(date.getTime() + 5.5 * 36e5), mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  return slot.days.includes(t.getUTCDay()) && mins >= slot.from * 60 && mins < slot.to * 60;
}
