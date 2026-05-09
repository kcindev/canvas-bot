const { Client, GatewayIntentBits } = require('discord.js');
const { fetchAssignmentsDueThisWeek } = require('./canvasClient');
const { getServerTimezone } = require('./dateUtils');
const { buildAssignmentsEmbed } = require('./formatter');

function createDiscordClient() {
  return new Client({
    intents: [GatewayIntentBits.Guilds]
  });
}

function getDiscordConfig() {
  const { DISCORD_CHANNEL_ID } = process.env;

  if (!DISCORD_CHANNEL_ID) {
    throw new Error('Missing DISCORD_CHANNEL_ID.');
  }

  return { channelId: DISCORD_CHANNEL_ID };
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

function attachInteractionHandlers(client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'due-this-week') {
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const assignmentCount = await postWeeklyDigest(client);
      await interaction.editReply(`Posted this week's Canvas digest with ${assignmentCount} assignment(s).`);
    } catch (error) {
      console.error('Failed to post digest from slash command:', error.message);
      await interaction.editReply('Sorry, I could not post the Canvas digest. Check the bot logs for details.');
    }
  });
}

module.exports = {
  attachInteractionHandlers,
  createDiscordClient,
  postWeeklyDigest
};
