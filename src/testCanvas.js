require('dotenv').config();

const { fetchActiveCourses } = require('./canvasClient');

async function main() {
  const courses = await fetchActiveCourses();

  if (courses.length === 0) {
    console.log('No active Canvas courses found.');
    return;
  }

  console.log(`Active Canvas courses (${courses.length}):`);

  for (const course of courses) {
    const courseName = course.name || course.course_code || 'Unnamed course';
    console.log(`- ${courseName} (${course.id})`);
  }
}

main().catch((error) => {
  console.error('Failed to fetch Canvas courses:', error.message);
  process.exit(1);
});
