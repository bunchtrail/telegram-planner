import crypto from 'crypto';
import { errorNoStore, jsonNoStore } from '@/app/lib/api-response';
import { TelegramAuthSchema } from '@/app/lib/validations/auth';

export const runtime = 'nodejs';

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const MAX_AUTH_FUTURE_SKEW_SECONDS = 60;

type TelegramUser = {
	id: number;
	username?: string;
	first_name?: string;
	last_name?: string;
};

const base64UrlEncode = (input: Buffer | string) =>
	Buffer.from(input)
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

const signJwt = (
	payload: Record<string, unknown>,
	secret: string,
	expiresInSeconds: number,
) => {
	const header = { alg: 'HS256', typ: 'JWT' };
	const now = Math.floor(Date.now() / 1000);
	const body = { ...payload, iat: now, exp: now + expiresInSeconds };
	const encodedHeader = base64UrlEncode(JSON.stringify(header));
	const encodedPayload = base64UrlEncode(JSON.stringify(body));
	const data = `${encodedHeader}.${encodedPayload}`;
	const signature = base64UrlEncode(
		crypto.createHmac('sha256', secret).update(data).digest(),
	);
	return `${data}.${signature}`;
};

const verifyInitData = (initData: string, botToken: string) => {
	const params = new URLSearchParams(initData);
	const hash = params.get('hash');
	if (!hash) {
		return { ok: false } as const;
	}

	params.delete('hash');
	const dataCheckString = Array.from(params.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');

	const secretKey = crypto
		.createHmac('sha256', 'WebAppData')
		.update(botToken)
		.digest();
	const computedHash = crypto
		.createHmac('sha256', secretKey)
		.update(dataCheckString)
		.digest('hex');

	const hashBuffer = Buffer.from(hash, 'hex');
	const computedBuffer = Buffer.from(computedHash, 'hex');
	if (
		hashBuffer.length !== computedBuffer.length ||
		!crypto.timingSafeEqual(hashBuffer, computedBuffer)
	) {
		return { ok: false } as const;
	}

	const authDateRaw = params.get('auth_date');
	const authDate = authDateRaw ? Number(authDateRaw) : 0;
	if (!authDate) {
		return { ok: false } as const;
	}

	const nowSeconds = Math.floor(Date.now() / 1000);
	const ageSeconds = nowSeconds - authDate;
	if (ageSeconds > MAX_AUTH_AGE_SECONDS) {
		return { ok: false } as const;
	}

	if (authDate - nowSeconds > MAX_AUTH_FUTURE_SKEW_SECONDS) {
		return { ok: false } as const;
	}

	const userRaw = params.get('user');
	if (!userRaw) {
		return { ok: false } as const;
	}

	let user: TelegramUser;
	try {
		user = JSON.parse(userRaw) as TelegramUser;
	} catch {
		return { ok: false } as const;
	}

	if (!user?.id) {
		return { ok: false } as const;
	}

	return { ok: true, user } as const;
};

export async function POST(request: Request) {
	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	const jwtSecret = process.env.SUPABASE_JWT_SECRET;

	if (!botToken || !jwtSecret) {
		return errorNoStore(500, 'AUTH_NOT_CONFIGURED');
	}

	const body = await request
		.json()
		.catch(() => null) as unknown | null;
	const parsed = TelegramAuthSchema.safeParse(body);
	if (!parsed.success) return errorNoStore(400, 'INVALID_REQUEST');

	const initData = parsed.data.initData;

	const verification = verifyInitData(initData, botToken);
	if (!verification.ok) {
		return errorNoStore(401, 'UNAUTHORIZED');
	}

	const telegramId = String(verification.user.id);
	const token = signJwt(
		{
			aud: 'authenticated',
			role: 'authenticated',
			sub: telegramId,
			telegram_id: telegramId,
		},
		jwtSecret,
		TOKEN_TTL_SECONDS,
	);

	return jsonNoStore(
		{
			ok: true,
			token,
			user: {
				id: telegramId,
				username: verification.user.username ?? null,
				first_name: verification.user.first_name ?? null,
				last_name: verification.user.last_name ?? null,
			},
		},
	);
}
