import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store',
} as const;

type JsonInit = Omit<ResponseInit, 'headers'> & {
	headers?: HeadersInit;
};

const withNoStoreHeaders = (headers?: HeadersInit) => ({
	...NO_STORE_HEADERS,
	...(headers ?? {}),
});

export const jsonNoStore = <T>(body: T, init: JsonInit = {}) =>
	NextResponse.json(body, {
		...init,
		headers: withNoStoreHeaders(init.headers),
	});

export const errorNoStore = (status: number, error: string) =>
	jsonNoStore(
		{
			ok: false,
			error,
		},
		{ status },
	);
