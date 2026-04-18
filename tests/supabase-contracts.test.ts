import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..');
const schemaSql = readFileSync(
	path.join(repoRoot, 'supabase', 'schema.sql'),
	'utf8',
);
const readme = readFileSync(
	path.join(repoRoot, 'supabase', 'README.md'),
	'utf8',
);

describe('supabase contracts', () => {
	test('schema snapshot includes the current planner entities and focus stats contract', () => {
		expect(schemaSql).toContain('create table if not exists public.habits');
		expect(schemaSql).toContain('create table if not exists public.habit_logs');
		expect(schemaSql).toContain('create table if not exists public.pomodoro_sessions');
		expect(schemaSql).toContain('session_date date not null');
		expect(schemaSql).toContain(
			'create or replace function public.get_weekly_focus_stats(',
		);
		expect(schemaSql).not.toContain(
			'create or replace function public.get_weekly_focus_stats(user_telegram_id text',
		);
	});

	test('bootstrap guidance uses migrations instead of a stale schema-only flow', () => {
		expect(readme).toContain('supabase db push');
		expect(readme).not.toContain('Run the SQL from `supabase/schema.sql`');
	});
});
