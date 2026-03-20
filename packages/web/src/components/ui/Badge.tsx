interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants = {
    success: 'bg-green-600/20 text-green-400 border-green-600/50',
    warning: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50',
    error: 'bg-red-600/20 text-red-400 border-red-600/50',
    info: 'bg-blue-600/20 text-blue-400 border-blue-600/50',
    default: 'bg-gray-600/20 text-gray-400 border-gray-600/50',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
