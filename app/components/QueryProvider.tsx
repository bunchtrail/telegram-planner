'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 30,
				gcTime: 1000 * 60 * 5,
				retry: 1,
				refetchOnWindowFocus: false,
			},
		},
	});
}

export default function QueryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [queryClient] = useState(makeQueryClient);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
