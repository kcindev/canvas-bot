require('dotenv').config();

const { fetchNotTurnedInAssignments } = require('./canvasClient');
const { getServerTimezone } = require('./dateUtils');

async function main() {
  const timezone = getServerTimezone();
  const assignments = await fetchNotTurnedInAssignments(timezone);

  console.log(`Assignments not turned in (${timezone}):`);

  if (assignments.length === 0) {
    console.log('No not-turned-in assignments found in the reminder window.');
    return;
  }

  for (const assignment of assignments) {
    console.log(`- ${assignment.name}`);
    console.log(`  Course: ${assignment.courseName}`);
    console.log(`  Due: ${assignment.dueAt}`);
    console.log(`  Workflow state: ${assignment.workflowState || 'missing'}`);
    console.log(`  Submitted at: ${assignment.submittedAt || 'missing'}`);
    console.log(`  URL: ${assignment.url || 'No URL available'}`);
  }
}

main().catch((error) => {
  console.error('Failed to fetch not-turned-in assignments:', error.message);
  process.exit(1);
});
