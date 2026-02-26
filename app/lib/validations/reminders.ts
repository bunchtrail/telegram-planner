import { z } from 'zod';

export const ReminderRunHeaderSchema = z.object({
  secret: z.string().min(20),
});
