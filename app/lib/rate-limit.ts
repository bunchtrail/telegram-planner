type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

const CLEANUPEINTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
	const now = Date.now();
	if (now - lastCleanup < CLEANUPEINTERVAL_MS) return;
	lastCleanup = now;
	for (const [key, entry] of store) {
		if (entry.resetAt <= now) store.delete(key);
	}
}

export type RateLimitResult =
	| { allowed: true }
	| { allowed: false; retryAfterMs: number };

export function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): RateLimitResult {
	cleanup();
	const now = Date.now();
	const entry = store.get(key);

	if (!entry || entry.resetAt <= now) {
		store.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true };
	}

	if (entry.count < maxRequests) {
		entry.count += 1;
		return { allowed: true };
	}

	return { allowed: false, retryAfterMs: entry.resetAt - now };
}
