require('dotenv').config();

const { fetchAssignmentsDueThisWeek } = require('./canvasClient');
const { getCurrentWeekRange, getServerTimezone, formatDateRange } = require('./dateUtils');

async function main() {
  const timezone = getServerTimezone();
  const { start, end } = getCurrentWeekRange(timezone);
  const assignments = await fetchAssignmentsDueThisWeek(timezone);

  console.log(`Assignments due this week (${formatDateRange(start, end)}, ${timezone}):`);

  if (assignments.length === 0) {
    console.log('No assignments due this week.');
    return;
  }

  for (const assignment of assignments) {
    console.log(`- ${assignment.name}`);
    console.log(`  Course: ${assignment.courseName}`);
    console.log(`  Due: ${assignment.dueAt}`);
    console.log(`  URL: ${assignment.url || 'No URL available'}`);
  }
}

main().catch((error) => {
  console.error('Failed to fetch Canvas assignments:', error.message);
  process.exit(1);
});
