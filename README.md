# discord bot to send canvas assignment notification

what the title says

## Testing

Use these commands to test each part of the local flow. None of the Canvas test scripts print tokens.

Fetch active Canvas courses and print course names with Canvas course IDs:

```bash
npm run test:canvas
```

Fetch assignments due this week and print the assignment name, course name, `due_at`, and URL without posting to Discord:

```bash
npm run test:assignments
```

Register the guild slash command:

```bash
npm run register-commands
```

Start the bot locally:

```bash
npm run dev
```

Then test the Discord command in your server:

```text
/due-this-week
```
