import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = await schema.parseAsync(body);
    return { data, error: null };
  } catch (err: unknown) {
    const issues =
      err !== null && typeof err === 'object' && 'issues' in err
        ? (err as { issues: unknown }).issues
        : undefined;
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Validation failed', issues },
        { status: 400 },
      ),
    };
  }
}
