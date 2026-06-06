'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('[ErrorBoundary]', error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					minHeight: '100dvh',
					padding: '24px',
					textAlign: 'center',
					fontFamily: 'var(--font-body), system-ui, sans-serif',
					background: 'var(--bg, #f2f2f7)',
					color: 'var(--ink, #000)',
				}}>
					<div style={{ fontSize: '48px', marginBottom: '16px' }}>😵</div>
					<h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
						Что-то пошло не так
					</h2>
					<p style={{ fontSize: '14px', color: 'var(--muted, #8e8e93)', marginBottom: '20px' }}>
						Попробуй перезагрузить приложение
					</p>
					<button
						onClick={() => window.location.reload()}
						style={{
							padding: '10px 24px',
							borderRadius: '12px',
							border: 'none',
							background: 'var(--accent, #ff9f0a)',
							color: 'var(--accent-ink, #fff)',
							fontWeight: 600,
							fontSize: '15px',
							cursor: 'pointer',
						}}
					>
						Перезагрузить
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
