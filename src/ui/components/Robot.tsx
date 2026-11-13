export type Mood = 'idle' | 'think' | 'work' | 'happy' | 'sad' | 'wait' | 'sleep';

const MOOD_ANIM: Record<Mood, string> = {
  idle: 'anim-bob',
  think: 'anim-bob',
  work: 'anim-type',
  happy: 'anim-jump',
  sad: 'anim-shake',
  wait: 'anim-wiggle',
  sleep: '',
};

/** まるいロボットのキャラクター */
export function Robot({ color, accent, mood = 'idle', size = 72, className = '' }: { color: string; accent: string; mood?: Mood; size?: number; className?: string }) {
  const eye = '#8ff0d0';
  return (
    <div className={`relative inline-block ${MOOD_ANIM[mood]} ${className}`} style={{ width: size, height: size * 1.05 }}>
      <svg viewBox="0 0 100 105" width={size} height={size * 1.05} aria-hidden>
        {/* アンテナ */}
        <line x1="50" y1="6" x2="50" y2="20" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="7" r="6" fill={mood === 'sad' ? '#ff6b6b' : mood === 'wait' ? '#ffcf4a' : mood === 'happy' ? '#8ff0d0' : '#ffcf4a'} />
        {/* 体 */}
        <ellipse cx="50" cy="98" rx="26" ry="5" fill="#000" opacity="0.08" />
        <rect x="30" y="74" width="40" height="20" rx="10" fill={accent} />
        {/* 頭 */}
        <rect x="12" y="20" width="76" height="62" rx="28" fill={color} />
        <rect x="12" y="20" width="76" height="62" rx="28" fill="none" stroke={accent} strokeWidth="3" opacity="0.5" />
        {/* 画面 */}
        <rect x="22" y="31" width="56" height="38" rx="17" fill="#3b2f4a" />
        <Face mood={mood} eye={eye} />
        {/* ほっぺ */}
        <circle cx="20" cy="66" r="5" fill={accent} opacity="0.45" />
        <circle cx="80" cy="66" r="5" fill={accent} opacity="0.45" />
      </svg>
      {mood === 'think' && <Bubble>💭</Bubble>}
      {mood === 'wait' && <Bubble>❓</Bubble>}
      {mood === 'sad' && <Bubble>💦</Bubble>}
      {mood === 'happy' && <Bubble>✨</Bubble>}
      {mood === 'sleep' && <Bubble>💤</Bubble>}
    </div>
  );
}

function Bubble({ children }: { children: string }) {
  return <span className="anim-pop absolute -right-2 -top-1 text-[0.9em] leading-none">{children}</span>;
}

function Face({ mood, eye }: { mood: Mood; eye: string }) {
  switch (mood) {
    case 'happy':
      return (
        <g stroke={eye} strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M33 50 q6 -8 12 0" />
          <path d="M55 50 q6 -8 12 0" />
          <path d="M42 58 q8 7 16 0" />
        </g>
      );
    case 'sad':
      return (
        <g stroke={eye} strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M33 46 l10 5 M33 51 l10 -5" />
          <path d="M57 46 l10 5 M57 51 l10 -5" />
          <path d="M42 62 q8 -6 16 0" />
        </g>
      );
    case 'sleep':
      return (
        <g stroke={eye} strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M33 50 h11 M56 50 h11" />
        </g>
      );
    case 'think':
      return (
        <g fill={eye}>
          <circle cx="42" cy="45" r="4.5" className="anim-blink" />
          <circle cx="62" cy="45" r="4.5" className="anim-blink" />
          <rect x="45" y="58" width="10" height="3" rx="1.5" />
        </g>
      );
    case 'work':
      return (
        <g fill={eye}>
          <rect x="34" y="46" width="11" height="4" rx="2" />
          <rect x="56" y="46" width="11" height="4" rx="2" />
          <circle cx="50" cy="60" r="2.5" />
        </g>
      );
    case 'wait':
      return (
        <g fill={eye}>
          <circle cx="39" cy="48" r="5" className="anim-blink" />
          <circle cx="61" cy="48" r="5" className="anim-blink" />
          <circle cx="50" cy="61" r="3.5" fill="none" stroke={eye} strokeWidth="3" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="39" cy="48" r="5" fill={eye} className="anim-blink" />
          <circle cx="61" cy="48" r="5" fill={eye} className="anim-blink" />
          <path d="M43 58 q7 5 14 0" stroke={eye} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      );
  }
}
