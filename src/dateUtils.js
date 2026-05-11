const { DateTime } = require('luxon');

function getServerTimezone() {
  return process.env.SERVER_TIMEZONE || 'America/Los_Angeles';
}

function getCurrentWeekRange(timezone = getServerTimezone(), now = DateTime.now()) {
  const localNow = now.setZone(timezone);
  const start = localNow.startOf('week');
  const end = start.plus({ days: 6 }).endOf('day');

  return { start, end, timezone };
}

function getReminderDateRange(timezone = getServerTimezone(), now = DateTime.now()) {
  const localNow = now.setZone(timezone);

  return {
    start: localNow.minus({ days: 14 }).startOf('day'),
    end: localNow.plus({ days: 14 }).endOf('day'),
    today: localNow.startOf('day'),
    timezone
  };
}

function isIsoDateTimeInRange(isoDateTime, start, end) {
  if (!isoDateTime) {
    return false;
  }

  const dateTime = DateTime.fromISO(isoDateTime, { setZone: true }).setZone(start.zoneName);
  return dateTime.isValid && dateTime >= start && dateTime <= end;
}

function formatDateRange(start, end) {
  return `${start.toFormat('LLL d, yyyy')} - ${end.toFormat('LLL d, yyyy')}`;
}

function formatDayHeading(dateTime) {
  return dateTime.toFormat('cccc, LLL d');
}

function formatDueTime(isoDateTime, timezone) {
  const dateTime = DateTime.fromISO(isoDateTime, { setZone: true }).setZone(timezone);

  if (!dateTime.isValid) {
    return 'Time unavailable';
  }

  return dateTime.toFormat('h:mm a');
}

function getDayKey(isoDateTime, timezone) {
  return DateTime.fromISO(isoDateTime, { setZone: true }).setZone(timezone).toISODate();
}

module.exports = {
  formatDateRange,
  formatDayHeading,
  formatDueTime,
  getCurrentWeekRange,
  getDayKey,
  getReminderDateRange,
  getServerTimezone,
  isIsoDateTimeInRange
};
