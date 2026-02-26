import { z } from 'zod';

export const TaskCreateSchema = z.object({
	title: z.string().min(1).max(160).trim(),
	duration: z.number().int().min(1).max(1440),
	repeat: z.enum(['none', 'daily', 'weekly']),
	repeatCount: z.number().int().min(1).max(365).default(1),
	color: z
		.string()
		.regex(/^#[0-9a-f]{6}$/i)
		.default('#ff9f0a'),
	startMinutes: z.number().int().min(0).max(1439).nullable().default(null),
	remindBeforeMinutes: z.number().int().min(0).max(1440).default(0),
});

export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
	id: z.string().uuid(),
});
