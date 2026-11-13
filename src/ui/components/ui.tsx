import { Star, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

type Tone = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
const TONES: Record<Tone, string> = {
  primary: 'bg-ink text-white hover:bg-[#2c2f3a]',
  accent: 'bg-coral text-white hover:bg-[#f45d40]',
  secondary: 'bg-surface text-ink border border-line hover:bg-[#faf9f7]',
  ghost: 'bg-transparent text-sub hover:bg-black/5',
  danger: 'bg-surface text-rose border border-rose/30 hover:bg-rose-soft',
};

export function Btn(props: { children: ReactNode; onClick?: () => void; tone?: Tone; disabled?: boolean; className?: string; size?: 'sm' | 'md' | 'lg'; ariaLabel?: string }) {
  const { tone = 'primary', size = 'md' } = props;
  const sz = size === 'lg' ? 'min-h-14 px-6 text-[15px]' : size === 'sm' ? 'min-h-11 px-3.5 text-[13px]' : 'min-h-12 px-5 text-sm';
  return (
    <button
      type="button"
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cx('press inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl font-bold disabled:cursor-not-allowed disabled:opacity-35', TONES[tone], sz, props.className)}
    >
      {props.children}
    </button>
  );
}

export function Card(props: { children: ReactNode; className?: string; onClick?: () => void }) {
  const C = props.onClick ? 'button' : 'div';
  return (
    <C type={props.onClick ? 'button' : undefined} onClick={props.onClick} className={cx('shadow-soft block w-full rounded-3xl bg-surface text-left', props.onClick && 'press cursor-pointer', props.className)}>
      {props.children}
    </C>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('text-[11px] font-bold tracking-[0.08em] text-faint', className)}>{children}</div>;
}

/** 下から出てくるシート */
export function Sheet(props: { open: boolean; onClose?: () => void; children: ReactNode; title?: ReactNode; tall?: boolean }) {
  const { open, onClose } = props;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="anim-fade absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('anim-rise safe-bottom absolute bottom-0 flex w-full max-w-[480px] flex-col rounded-t-[28px] bg-bg', props.tall ? 'max-h-[92dvh]' : 'max-h-[85dvh]')} role="dialog" aria-modal>
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
        {(props.title || onClose) && (
          <div className="flex items-center gap-2 px-5 pb-1 pt-3">
            <div className="flex-1 text-[17px] font-bold">{props.title}</div>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-sub hover:bg-black/5">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="no-scrollbar overflow-y-auto px-5 pb-6 pt-2">{props.children}</div>
      </div>
    </div>
  );
}

export function Stars({ n, max = 3, size = 18, animate }: { n: number; max?: number; size?: number; animate?: boolean }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`★${n}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={0}
          className={cx(i < n ? 'fill-[#f5b23d]' : 'fill-[#e4e0d8]', animate && i < n && 'anim-star')}
          style={animate ? { animationDelay: `${0.2 + i * 0.22}s` } : undefined}
        />
      ))}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', className ?? 'bg-slate-soft text-slate')}>{children}</span>;
}

export function Meter({ value, max, tone = 'bg-ink', className }: { value: number; max: number; tone?: string; className?: string }) {
  return (
    <div className={cx('h-1.5 overflow-hidden rounded-full bg-line', className)}>
      <div className={cx('h-full rounded-full transition-all duration-300', tone)} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} />
    </div>
  );
}

/** アイコンを色つきの角丸タイルに入れる */
export function Tile({ children, className, size = 44 }: { children: ReactNode; className?: string; size?: number }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-2xl', className)} style={{ width: size, height: size }}>
      {children}
    </span>
  );
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;
