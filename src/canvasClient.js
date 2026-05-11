const { DateTime } = require('luxon');
const { getCurrentWeekRange, getReminderDateRange, isIsoDateTimeInRange } = require('./dateUtils');

function getCanvasConfig() {
  const { CANVAS_BASE_URL, CANVAS_ACCESS_TOKEN } = process.env;

  if (!CANVAS_BASE_URL || !CANVAS_ACCESS_TOKEN) {
    throw new Error('Missing Canvas configuration. Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN.');
  }

  return {
    baseUrl: CANVAS_BASE_URL.replace(/\/+$/, ''),
    accessToken: CANVAS_ACCESS_TOKEN
  };
}

function parseNextLink(linkHeader) {
  if (!linkHeader) {
    return null;
  }

  const links = linkHeader.split(',').map((part) => part.trim());
  const nextLink = links.find((link) => link.includes('rel="next"'));

  if (!nextLink) {
    return null;
  }

  const match = nextLink.match(/<([^>]+)>/);
  return match ? match[1] : null;
}

async function canvasGet(pathOrUrl) {
  const { baseUrl, accessToken } = getCanvasConfig();
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${baseUrl}${pathOrUrl}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    const detail = body ? ` Canvas response: ${body.slice(0, 300)}` : '';
    const error = new Error(`Canvas request failed with ${response.status} ${response.statusText}.${detail}`);
    error.status = response.status;
    throw error;
  }

  return {
    data: await response.json(),
    nextUrl: parseNextLink(response.headers.get('link'))
  };
}

async function getPaginatedCanvasResults(path) {
  const results = [];
  let nextUrl = path;

  while (nextUrl) {
    const page = await canvasGet(nextUrl);
    results.push(...page.data);
    nextUrl = page.nextUrl;
  }

  return results;
}

async function fetchActiveCourses() {
  return getPaginatedCanvasResults('/api/v1/courses?enrollment_state=active&state[]=available&per_page=100');
}

async function fetchCourseAssignments(courseId) {
  return getPaginatedCanvasResults(
    `/api/v1/courses/${encodeURIComponent(courseId)}/assignments?bucket=upcoming&order_by=due_at&per_page=100`
  );
}

async function fetchAllCourseAssignments(courseId) {
  return getPaginatedCanvasResults(
    `/api/v1/courses/${encodeURIComponent(courseId)}/assignments?order_by=due_at&per_page=100`
  );
}

async function fetchAssignmentSubmission(courseId, assignmentId) {
  const page = await canvasGet(
    `/api/v1/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions/self`
  );

  return page.data;
}

function normalizeAssignment(course, assignment, timezone) {
  return {
    courseId: course.id,
    courseName: course.name || course.course_code || `Course ${course.id}`,
    id: assignment.id,
    name: assignment.name || 'Untitled assignment',
    dueAt: assignment.due_at,
    dueAtLocal: DateTime.fromISO(assignment.due_at, { setZone: true }).setZone(timezone),
    url: assignment.html_url || null
  };
}

function isAssignmentUnavailable(assignment) {
  return assignment.locked_for_user === true || assignment.locked === true || assignment.published === false;
}

function isSubmissionTurnedIn(submission) {
  if (!submission) {
    return false;
  }

  if (submission.workflow_state === 'unsubmitted') {
    return false;
  }

  return (
    submission.workflow_state === 'submitted' ||
    submission.workflow_state === 'graded' ||
    Boolean(submission.submitted_at)
  );
}

function normalizeNotTurnedInAssignment(course, assignment, submission, timezone) {
  return {
    ...normalizeAssignment(course, assignment, timezone),
    workflowState: submission ? submission.workflow_state || null : null,
    submittedAt: submission ? submission.submitted_at || null : null
  };
}

async function fetchAssignmentsDueThisWeek(timezone) {
  const { start, end } = getCurrentWeekRange(timezone);
  const courses = await fetchActiveCourses();
  const assignments = [];

  for (const course of courses) {
    try {
      const courseAssignments = await fetchCourseAssignments(course.id);
      const dueThisWeek = courseAssignments
        .filter((assignment) => isIsoDateTimeInRange(assignment.due_at, start, end))
        .map((assignment) => normalizeAssignment(course, assignment, timezone));

      assignments.push(...dueThisWeek);
    } catch (error) {
      console.error(`Failed to fetch assignments for Canvas course ${course.id}:`, error.message);
    }
  }

  return assignments.sort((a, b) => a.dueAtLocal.toMillis() - b.dueAtLocal.toMillis());
}

async function fetchNotTurnedInAssignments(timezone) {
  const { start, end } = getReminderDateRange(timezone);
  const courses = await fetchActiveCourses();
  const assignments = [];

  for (const course of courses) {
    try {
      const courseAssignments = await fetchAllCourseAssignments(course.id);
      const candidates = courseAssignments.filter((assignment) => (
        assignment.due_at &&
        !isAssignmentUnavailable(assignment) &&
        isIsoDateTimeInRange(assignment.due_at, start, end)
      ));

      for (const assignment of candidates) {
        try {
          const submission = await fetchAssignmentSubmission(course.id, assignment.id);

          if (!isSubmissionTurnedIn(submission)) {
            assignments.push(normalizeNotTurnedInAssignment(course, assignment, submission, timezone));
          }
        } catch (error) {
          console.error(
            `Failed to fetch Canvas submission for course ${course.id}, assignment ${assignment.id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error(`Failed to fetch assignments for Canvas course ${course.id}:`, error.message);
    }
  }

  return assignments.sort((a, b) => a.dueAtLocal.toMillis() - b.dueAtLocal.toMillis());
}

module.exports = {
  canvasGet,
  fetchActiveCourses,
  fetchAllCourseAssignments,
  fetchAssignmentSubmission,
  fetchAssignmentsDueThisWeek,
  fetchCourseAssignments,
  fetchNotTurnedInAssignments,
  getPaginatedCanvasResults,
  isAssignmentUnavailable,
  isSubmissionTurnedIn,
  parseNextLink
};

