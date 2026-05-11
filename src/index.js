require('dotenv').config();

const cron = require('node-cron');
const {
  attachInteractionHandlers,
  createDiscordClient,
  postNotTurnedInReminder,
  postWeeklyDigest
} = require('./discordClient');
const { getServerTimezone } = require('./dateUtils');
const { REQUIRED_ENV_VARS, requireEnvVars } = require('./env');

function validateEnvironment() {
  requireEnvVars(REQUIRED_ENV_VARS);
  console.log(`Startup health check: required environment variables present (${REQUIRED_ENV_VARS.join(', ')}).`);
}

function scheduleWeeklyDigest(client) {
  const timezone = getServerTimezone();
  const cronExpression = '0 8 * * 1';

  cron.schedule(
    cronExpression,
    async () => {
      try {
        const assignmentCount = await postWeeklyDigest(client);
        console.log(`Scheduled weekly digest posted with ${assignmentCount} assignment(s).`);
      } catch (error) {
        console.error('Scheduled weekly digest failed:', error.message || error.code || error.name || 'Unknown error');
      }
    },
    { timezone }
  );

  console.log(`Scheduled weekly digest for Mondays at 8:00 AM (${timezone}).`);
  console.log(`Startup health check: weekly cron schedule registered (${cronExpression}, timezone: ${timezone}).`);
}

function scheduleDailyNotTurnedInReminder(client) {
  const timezone = getServerTimezone();
  const cronExpression = '0 7 * * *';

  cron.schedule(
    cronExpression,
    async () => {
      try {
        const assignmentCount = await postNotTurnedInReminder(client);
        console.log(`Daily not-turned-in reminder posted with ${assignmentCount} assignment(s).`);
      } catch (error) {
        console.error('Daily not-turned-in reminder failed:', error.message || error.code || error.name || 'Unknown error');
      }
    },
    { timezone }
  );

  console.log(`Scheduled daily not-turned-in reminder for 7:00 AM (${timezone}).`);
  console.log(`Startup health check: daily reminder cron schedule registered (${cronExpression}, timezone: ${timezone}).`);
}

async function main() {
  validateEnvironment();

  const client = createDiscordClient();
  attachInteractionHandlers(client);

  client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}.`);
    console.log('Startup health check: bot logged into Discord.');
    scheduleWeeklyDigest(client);
    scheduleDailyNotTurnedInReminder(client);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

main().catch((error) => {
  const detail = error.message || error.code || error.name || 'Unknown startup error';
  console.error('Bot startup failed:', detail);
  process.exit(1);
});
