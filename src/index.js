require('dotenv').config();

const cron = require('node-cron');
const { attachInteractionHandlers, createDiscordClient, postWeeklyDigest } = require('./discordClient');
const { getServerTimezone } = require('./dateUtils');

function requireEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function validateEnvironment() {
  [
    'DISCORD_BOT_TOKEN',
    'DISCORD_CLIENT_ID',
    'DISCORD_GUILD_ID',
    'DISCORD_CHANNEL_ID',
    'CANVAS_BASE_URL',
    'CANVAS_ACCESS_TOKEN'
  ].forEach(requireEnv);
}

function scheduleWeeklyDigest(client) {
  const timezone = getServerTimezone();

  cron.schedule(
    '0 8 * * 1',
    async () => {
      try {
        const assignmentCount = await postWeeklyDigest(client);
        console.log(`Scheduled weekly digest posted with ${assignmentCount} assignment(s).`);
      } catch (error) {
        console.error('Scheduled weekly digest failed:', error.message);
      }
    },
    { timezone }
  );

  console.log(`Scheduled weekly digest for Mondays at 8:00 AM (${timezone}).`);
}

async function main() {
  validateEnvironment();

  const client = createDiscordClient();
  attachInteractionHandlers(client);

  client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}.`);
    scheduleWeeklyDigest(client);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);
}

main().catch((error) => {
  console.error('Bot startup failed:', error.message);
  process.exit(1);
});
