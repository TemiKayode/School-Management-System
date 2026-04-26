import { cn } from '@/lib/utils';

const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
];

function colorFor(name?: string) {
  if (!name) return PALETTE[0];
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  className?: string;
}

const SIZE = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export function Avatar({ name, src, size = 'md', shape = 'rounded', className }: AvatarProps) {
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (src) {
    return (
      <img
        src={src} alt={name || 'Avatar'}
        className={cn(SIZE[size], radius, 'object-cover flex-shrink-0', className)}
      />
    );
  }

  return (
    <div className={cn(SIZE[size], radius, 'flex items-center justify-center font-bold flex-shrink-0', colorFor(name), className)}>
      {initials}
    </div>
  );
}

export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const visible = names.slice(0, max);
  const overflow = names.length - max;
  return (
    <div className="flex items-center">
      {visible.map((name, i) => (
        <div key={i} className="-ml-2 first:ml-0 ring-2 ring-white rounded-xl">
          <Avatar name={name} size="sm" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="-ml-2 w-8 h-8 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center ring-2 ring-white">
          +{overflow}
        </div>
      )}
    </div>
  );
}
