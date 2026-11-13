import { useEffect, type ReactNode } from 'react';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

type Tone = 'pink' | 'mint' | 'lemon' | 'sky' | 'grape' | 'white' | 'ghost';
const TONES: Record<Tone, string> = {
  pink: 'bg-pink text-white border-[#e8507a]',
  mint: 'bg-mint text-white border-[#249068]',
  lemon: 'bg-lemon text-ink border-[#e6b020]',
  sky: 'bg-sky text-white border-[#3b98d6]',
  grape: 'bg-grape text-white border-[#7c5cd1]',
  white: 'bg-white text-ink border-[#f0d6df]',
  ghost: 'bg-transparent text-ink border-transparent shadow-none',
};

export function Btn(props: { children: ReactNode; onClick?: () => void; tone?: Tone; disabled?: boolean; className?: string; size?: 'sm' | 'md' | 'lg'; ariaLabel?: string }) {
  const { tone = 'pink', size = 'md' } = props;
  const sz = size === 'lg' ? 'min-h-14 px-6 text-lg' : size === 'sm' ? 'min-h-11 px-3 text-sm' : 'min-h-12 px-5 text-base';
  return (
    <button
      type="button"
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cx(
        'press pop-shadow inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-b-4 font-extrabold tracking-wide disabled:cursor-not-allowed disabled:opacity-40',
        TONES[tone],
        sz,
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}

export function Card(props: { children: ReactNode; className?: string; onClick?: () => void }) {
  const C = props.onClick ? 'button' : 'div';
  return (
    <C
      type={props.onClick ? 'button' : undefined}
      onClick={props.onClick}
      className={cx('pop-shadow block w-full rounded-3xl border-2 border-[#f6dbe4] bg-white text-left', props.onClick && 'press cursor-pointer', props.className)}
    >
      {props.children}
    </C>
  );
}

/** 下から出てくるシート */
export function Sheet(props: { open: boolean; onClose?: () => void; children: ReactNode; title?: ReactNode; tall?: boolean }) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="anim-fade absolute inset-0 bg-[#4a3b55]/40" onClick={props.onClose} />
      <div className={cx('anim-rise safe-bottom absolute bottom-0 flex w-full max-w-[480px] flex-col rounded-t-[32px] bg-cream shadow-2xl', props.tall ? 'max-h-[92dvh]' : 'max-h-[85dvh]')} role="dialog" aria-modal>
        <div className="flex items-center justify-between px-5 pt-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-[#f0cfdb]" />
        </div>
        {(props.title || props.onClose) && (
          <div className="flex items-center gap-2 px-5 pb-1 pt-2">
            <div className="flex-1 text-lg font-extrabold">{props.title}</div>
            {props.onClose && (
              <button type="button" onClick={props.onClose} aria-label="閉じる" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-xl text-[#b7a3b8]">
                ✕
              </button>
            )}
          </div>
        )}
        <div className="no-scrollbar overflow-y-auto px-5 pb-6 pt-2">{props.children}</div>
      </div>
    </div>
  );
}

export function Stars({ n, max = 3, size = 'text-xl', animate }: { n: number; max?: number; size?: string; animate?: boolean }) {
  return (
    <span className={cx('inline-flex gap-0.5', size)} aria-label={`★${n}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cx(i < n ? 'text-lemon drop-shadow-[0_2px_0_#e6b020]' : 'text-[#ecdde3]', animate && i < n && 'anim-star')} style={animate ? { animationDelay: `${0.25 + i * 0.3}s` } : undefined}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', className ?? 'bg-pink-soft text-pink')}>{children}</span>;
}

export function Meter({ value, max, tone = 'bg-pink', className }: { value: number; max: number; tone?: string; className?: string }) {
  return (
    <div className={cx('h-3 overflow-hidden rounded-full bg-[#f6e6ec]', className)}>
      <div className={cx('h-full rounded-full transition-all duration-300', tone)} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} />
    </div>
  );
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;
