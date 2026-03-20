interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'error' | 'pending';
  label?: string;
  pulse?: boolean;
}

export function StatusIndicator({ status, label, pulse = true }: StatusIndicatorProps) {
  const colors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    error: 'bg-red-500',
    pending: 'bg-yellow-500',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        {pulse && status === 'active' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status]}`} />
      </span>
      {label && <span className="text-gray-300">{label}</span>}
    </div>
  );
}
