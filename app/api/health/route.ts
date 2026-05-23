import { jsonNoStore } from '@/app/lib/api-response';

export const runtime = 'nodejs';

export async function GET() {
	return jsonNoStore({
		ok: true,
		uptime: process.uptime(),
		timestamp: new Date().toISOString(),
	});
}
