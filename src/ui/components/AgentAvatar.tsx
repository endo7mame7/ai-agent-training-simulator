import { shade } from './iso';
import { AGENT_BODY } from './OfficeScene';

/** 丸いタイルに入った人形(リストやシート用) */
export function AgentAvatar({ id, size = 44, bg = '#78e08f' }: { id: string; size?: number; bg?: string }) {
  const body = AGENT_BODY[id] ?? '#fafbfc';
  const dark = shade(body, body === '#fafbfc' ? 0.14 : 0.28);
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden className="shrink-0">
      <rect width="44" height="44" rx="14" fill={bg} />
      <ellipse cx="22" cy="38" rx="9" ry="3" fill="#000" opacity="0.12" />
      <rect x="15" y="20" width="14" height="18" rx="7" fill={body} />
      <path d="M22 20 a7 7 0 0 1 7 7 V31 a7 7 0 0 1 -7 7 Z" fill={dark} opacity="0.55" />
      <circle cx="22" cy="12.5" r="6.5" fill={body} />
      <path d="M22 6 a6.5 6.5 0 0 1 0 13 z" fill={dark} opacity="0.55" />
    </svg>
  );
}
