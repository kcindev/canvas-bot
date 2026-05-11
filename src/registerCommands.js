require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

function getCommandConfig() {
  const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

  if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
    throw new Error('Missing Discord command configuration. Set DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID.');
  }

  return {
    token: DISCORD_BOT_TOKEN,
    clientId: DISCORD_CLIENT_ID,
    guildId: DISCORD_GUILD_ID
  };
}

function buildCommands() {
  return [
    new SlashCommandBuilder()
      .setName('due-this-week')
      .setDescription('Post a Canvas assignment digest for the current week.')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('not-turned-in')
      .setDescription('Post a Canvas reminder for assignments not turned in.')
      .toJSON()
  ];
}

async function registerCommands() {
  const { token, clientId, guildId } = getCommandConfig();
  const rest = new REST({ version: '10' }).setToken(token);

  console.log('Registering guild slash commands...');
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: buildCommands()
  });
  console.log('Registered /due-this-week and /not-turned-in.');
}

if (require.main === module) {
  registerCommands().catch((error) => {
    console.error('Failed to register slash commands:', error.message);
    process.exit(1);
  });
}

module.exports = {
  buildCommands,
  registerCommands
};
