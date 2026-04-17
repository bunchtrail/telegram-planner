export const getReminderRunSecret = (
  env: NodeJS.ProcessEnv = process.env,
) => env.REMINDERS_RUN_SECRET ?? env.CRON_SECRET ?? null;
