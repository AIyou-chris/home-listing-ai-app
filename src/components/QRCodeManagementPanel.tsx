import React from 'react';

interface QRCodeManagementPanelProps {
	onCreate: () => void;
	className?: string;
	children?: React.ReactNode;
	stats?: {
		total: number;
		totalScans: number;
		averageScans: number;
	};
	loading?: boolean;
	open?: boolean;
	onToggle?: (open: boolean) => void;
}

const QRCodeManagementPanel: React.FC<QRCodeManagementPanelProps> = ({
	onCreate,
	className = '',
	children,
	stats,
	loading = false,
	open = true,
	onToggle
}) => {
	const total = stats?.total ?? 0;
	const totalScans = stats?.totalScans ?? 0;
	const averageScans = stats?.averageScans ?? 0;

	const formatStat = (value: number): string => {
		if (loading) return '…';
		if (Number.isNaN(value)) return '0';
		return value.toString();
	};

	return (
		<details
			className={`rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 open:shadow-lg ${className}`}
			open={open}
			onToggle={(event) => {
				onToggle?.((event.target as HTMLDetailsElement).open);
			}}
		>
			<summary className="flex cursor-pointer list-none flex-col gap-3 border-b border-slate-200 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-semibold text-slate-900">QR Code Management</h2>
					<p className="text-sm text-slate-500">
						Create and manage QR codes that link directly to your AI business card.
					</p>
				</div>
				<button
					type="button"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						onCreate();
					}}
					className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
				>
					<span className="material-symbols-outlined text-base">qr_code_2_add</span>
					Create QR Code
				</button>
			</summary>

			<div className="grid gap-4 px-6 py-6 sm:grid-cols-3">
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center shadow-inner">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active QR Codes</p>
					<p className="mt-2 text-2xl font-semibold text-slate-900">{formatStat(total)}</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center shadow-inner">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Scans</p>
					<p className="mt-2 text-2xl font-semibold text-slate-900">{formatStat(totalScans)}</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center shadow-inner">
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg. Scans per QR</p>
					<p className="mt-2 text-2xl font-semibold text-slate-900">{formatStat(averageScans)}</p>
				</div>
			</div>

			<div className="px-6 pb-8">
				<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
					{children ? (
						<div className="mx-auto flex max-w-full justify-center">{children}</div>
					) : (
						<>
							<p className="text-sm font-medium">No QR codes yet</p>
							<p className="mt-2 text-sm">
								Generate your first QR code to share your AI business card on signs, postcards, and more.
							</p>
						</>
					)}
				</div>
			</div>
		</details>
	);
};

export default QRCodeManagementPanel;

