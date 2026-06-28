'use client';

type AlertToastProps = {
    alert: {
        message: string;
        type: 'success' | 'error' | 'info';
    } | null;
};

export function AlertToast({ alert }: AlertToastProps) {
    if (!alert) return null;

    const colorClass =
        alert.type === 'success'
            ? 'bg-emerald-500'
            : alert.type === 'error'
              ? 'bg-red-500'
              : 'bg-zinc-800';

    return (
        <div className="fixed left-4 right-4 top-4 z-50">
            <div
                className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${colorClass}`}
            >
                {alert.message}
            </div>
        </div>
    );
}
