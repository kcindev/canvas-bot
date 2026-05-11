const REQUIRED_ENV_VARS = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'DISCORD_CHANNEL_ID',
  'DISCORD_USER_ID',
  'CANVAS_BASE_URL',
  'CANVAS_ACCESS_TOKEN',
  'SERVER_TIMEZONE'
];

function getMissingEnvVars(names) {
  return names.filter((name) => !process.env[name]);
}

function requireEnvVars(names, context = 'environment') {
  const missing = getMissingEnvVars(names);

  if (missing.length > 0) {
    throw new Error(`Missing required ${context} variable(s): ${missing.join(', ')}`);
  }
}

module.exports = {
  REQUIRED_ENV_VARS,
  getMissingEnvVars,
  requireEnvVars
};
