const { EmbedBuilder } = require('discord.js');
const {
  formatDateRange,
  formatDayHeading,
  formatDueTime,
  getCurrentWeekRange,
  getDayKey
} = require('./dateUtils');

const MAX_FIELD_VALUE_LENGTH = 1024;
const MAX_EMBED_FIELDS = 25;
const TRAILING_SECTION_DATE_PATTERN = /,\s*Section\s+\d+\s*\(\d{1,2}\/\d{1,2}\/\d{4}\)\s*$/i;

function groupAssignmentsByDay(assignments, timezone) {
  return assignments.reduce((groups, assignment) => {
    const key = getDayKey(assignment.dueAt, timezone);
    const existing = groups.get(key) || [];
    existing.push(assignment);
    groups.set(key, existing);
    return groups;
  }, new Map());
}

function formatAssignmentLine(assignment, timezone) {
  const dueTime = formatDueTime(assignment.dueAt, timezone);
  const assignmentName = assignment.url ? `[${assignment.name}](${assignment.url})` : assignment.name;
  const courseName = cleanCourseNameForDisplay(assignment.courseName);

  return `**${dueTime}** — ${assignmentName}\nCourse: ${courseName}`;
}

function cleanCourseNameForDisplay(courseName) {
  return courseName.replace(TRAILING_SECTION_DATE_PATTERN, '').trim();
}

function truncateFieldValue(value) {
  if (value.length <= MAX_FIELD_VALUE_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_FIELD_VALUE_LENGTH - 20)}\n...and more`;
}

function buildAssignmentsEmbed(assignments, timezone) {
  const { start, end } = getCurrentWeekRange(timezone);
  const embed = new EmbedBuilder()
    .setTitle('Assignments due this week')
    .setDescription(`Date range: ${formatDateRange(start, end)}\nTimezone: ${timezone}`)
    .setColor(0x2f80ed)
    .setTimestamp(new Date());

  if (assignments.length === 0) {
    embed.addFields({
      name: 'No assignments due',
      value: 'Nothing with a Canvas due date falls within this week.'
    });

    return embed;
  }

  const grouped = groupAssignmentsByDay(assignments, timezone);
  let fieldsAdded = 0;

  for (const [dayKey, dayAssignments] of grouped.entries()) {
    if (fieldsAdded >= MAX_EMBED_FIELDS) {
      break;
    }

    const day = dayAssignments[0].dueAtLocal;
    const value = dayAssignments.map((assignment) => formatAssignmentLine(assignment, timezone)).join('\n\n');

    embed.addFields({
      name: formatDayHeading(day),
      value: truncateFieldValue(value)
    });

    fieldsAdded += 1;
  }

  if (grouped.size > MAX_EMBED_FIELDS) {
    embed.setFooter({ text: `Showing the first ${MAX_EMBED_FIELDS} days with assignments.` });
  }

  return embed;
}

module.exports = {
  buildAssignmentsEmbed,
  cleanCourseNameForDisplay,
  formatAssignmentLine,
  groupAssignmentsByDay
};
