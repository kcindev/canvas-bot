const { Client, GatewayIntentBits } = require('discord.js');
const { fetchAssignmentsDueThisWeek, fetchNotTurnedInAssignments } = require('./canvasClient');
const { getServerTimezone } = require('./dateUtils');
const { buildAssignmentsEmbed, buildNotTurnedInEmbed } = require('./formatter');

function createDiscordClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds]
  });
}

function getDiscordConfig() {
  const { DISCORD_CHANNEL_ID, DISCORD_USER_ID } = process.env;

  if (!DISCORD_CHANNEL_ID) {
    throw new Error('Missing DISCORD_CHANNEL_ID.');
  }

  return { channelId: DISCORD_CHANNEL_ID, userId: DISCORD_USER_ID };
}

async function postWeeklyDigest(client) {
  const { channelId } = getDiscordConfig();
  const timezone = getServerTimezone();
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error(`Discord channel ${channelId} was not found or is not text-based.`);
  }

  const assignments = await fetchAssignmentsDueThisWeek(timezone);
  const embed = buildAssignmentsEmbed(assignments, timezone);
  await channel.send({ embeds: [embed] });

  return assignments.length;
}

async function postNotTurnedInReminder(client) {
  const { channelId, userId } = getDiscordConfig();

  if (!userId) {
    throw new Error('Missing DISCORD_USER_ID.');
  }

  const timezone = getServerTimezone();
  const channel = await client.channels.fetch(channelId);

  if (!channel || !channel.isTextBased()) {
    throw new Error(`Discord channel ${channelId} was not found or is not text-based.`);
  }

  const assignments = await fetchNotTurnedInAssignments(timezone);
  const embed = buildNotTurnedInEmbed(assignments, timezone, userId);
  await channel.send({
    content: `<@${userId}>`,
    embeds: [embed],
    allowedMentions: { users: [userId] }
  });

  return assignments.length;
}

function attachInteractionHandlers(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName === 'due-this-week') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const assignmentCount = await postWeeklyDigest(client);
        await interaction.editReply(`Posted this week's Canvas digest with ${assignmentCount} assignment(s).`);
      } catch (error) {
        console.error('Failed to post digest from slash command:', error.message);
        await interaction.editReply('Sorry, I could not post the Canvas digest. Check the bot logs for details.');
      }
    }

    if (interaction.commandName === 'not-turned-in') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const assignmentCount = await postNotTurnedInReminder(client);
        await interaction.editReply(`Posted not-turned-in reminder with ${assignmentCount} assignment(s).`);
      } catch (error) {
        console.error('Failed to post not-turned-in reminder from slash command:', error.message);
        await interaction.editReply('Sorry, I could not post the not-turned-in reminder. Check the bot logs for details.');
      }
    }
  });
}

module.exports = {
  attachInteractionHandlers,
  createDiscordClient,
  postNotTurnedInReminder,
  postWeeklyDigest
};
