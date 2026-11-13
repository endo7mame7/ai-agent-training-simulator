import type { ReactNode } from 'react';
import { cx } from '../util';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'chip';

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  title?: string;
  className?: string;
  active?: boolean;
}) {
  const { variant = 'secondary', active } = props;
  const base = 'inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap';
  const v: Record<Variant, string> = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 px-4 py-2 shadow-sm',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1.5',
    ghost: 'text-slate-600 hover:bg-slate-200/70 px-2 py-1',
    danger: 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 px-3 py-1.5',
    chip: cx('border px-2.5 py-1 text-xs', active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'),
  };
  return (
    <button type="button" title={props.title} disabled={props.disabled} onClick={props.onClick} className={cx(base, v[variant], props.className)}>
      {props.children}
    </button>
  );
}

export function Panel(props: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-lg border border-slate-200 bg-white shadow-sm', props.className)}>
      {props.title !== undefined && (
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
          <h2 className="text-sm font-bold text-slate-700">{props.title}</h2>
          {props.right}
        </header>
      )}
      <div className="p-4">{props.children}</div>
    </section>
  );
}

export function Modal(props: { onClose: () => void; children: ReactNode; width?: string; title?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-6" onClick={props.onClose}>
      <div className={cx('fadein relative my-4 rounded-xl bg-white shadow-2xl', props.width ?? 'w-[880px]')} onClick={(e) => e.stopPropagation()}>
        {props.title !== undefined && (
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
            <div className="text-lg font-bold">{props.title}</div>
            <button type="button" className="cursor-pointer rounded px-2 text-2xl leading-none text-slate-400 hover:text-slate-700" onClick={props.onClose} aria-label="閉じる">
              ×
            </button>
          </header>
        )}
        <div className="p-6">{props.children}</div>
      </div>
    </div>
  );
}

/** 用語解説はツールチップ1行 */
export function Tip(props: { text: string }) {
  return (
    <span title={props.text} className="ml-0.5 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 align-middle">
      ?
    </span>
  );
}

export function Stat(props: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'neutral' }) {
  const tone = props.tone === 'good' ? 'text-teal-700' : props.tone === 'bad' ? 'text-rose-600' : 'text-slate-900';
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-slate-500">{props.label}</div>
      <div className={cx('text-lg font-bold tabular-nums leading-tight', tone)}>{props.value}</div>
      {props.sub && <div className="text-[11px] text-slate-500">{props.sub}</div>}
    </div>
  );
}
