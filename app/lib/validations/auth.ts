import { z } from 'zod';

export const TelegramAuthSchema = z.object({
  initData: z.string().min(1).max(4096),
});
