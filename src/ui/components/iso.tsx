/**
 * アイソメトリックの描画ヘルパー(SVG)。
 * ワールド座標 (x, y, z) を画面座標に変換し、箱を3面(上・左・右)のフラットな陰影で描く。
 */
import type { ReactNode } from 'react';

export const UNIT = 24;
const COS = 0.866;

export function P(x: number, y: number, z = 0): [number, number] {
  return [(x - y) * COS * UNIT, (x + y) * 0.5 * UNIT - z * UNIT];
}

const pts = (list: [number, number, number][]) => list.map(([x, y, z]) => P(x, y, z).join(',')).join(' ');

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amt))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export interface BoxProps {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h: number;
  color: string;
  top?: string;
  left?: string;
  right?: string;
  children?: ReactNode;
}

/** 箱。左面(手前左)と右面(手前右)が見える */
export function Box({ x, y, z = 0, w, d, h, color, top, left, right, children }: BoxProps) {
  return (
    <g>
      <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={left ?? shade(color, 0.1)} />
      <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={right ?? shade(color, 0.22)} />
      <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={top ?? color} />
      {children}
    </g>
  );
}

/** 床の上に置く平面(ラグなど) */
export function Flat({ x, y, z = 0, w, d, color }: { x: number; y: number; z?: number; w: number; d: number; color: string }) {
  return <polygon points={pts([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]])} fill={color} />;
}

/** 左面(y = 一定の面)上の点 */
export const onLeft = (x: number, y: number, z: number) => P(x, y, z);

/** 観葉植物 */
export function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const [cx, cy] = P(x + 0.3, y + 0.3, 0.55 * scale);
  const leaf = '#4cc463';
  const leafDark = '#2f9e48';
  const s = scale;
  return (
    <g>
      <Box x={x} y={y} w={0.6 * s} d={0.6 * s} h={0.55 * s} color="#f4f6fa" />
      <g transform={`translate(${cx} ${cy})`}>
        <ellipse cx={-9 * s} cy={-12 * s} rx={9 * s} ry={5 * s} fill={leafDark} transform={`rotate(-35 ${-9 * s} ${-12 * s})`} />
        <ellipse cx={9 * s} cy={-12 * s} rx={9 * s} ry={5 * s} fill={leafDark} transform={`rotate(35 ${9 * s} ${-12 * s})`} />
        <ellipse cx={-5 * s} cy={-18 * s} rx={8 * s} ry={4.5 * s} fill={leaf} transform={`rotate(-60 ${-5 * s} ${-18 * s})`} />
        <ellipse cx={5 * s} cy={-18 * s} rx={8 * s} ry={4.5 * s} fill={leaf} transform={`rotate(60 ${5 * s} ${-18 * s})`} />
        <ellipse cx={0} cy={-20 * s} rx={4 * s} ry={9 * s} fill={leaf} />
      </g>
    </g>
  );
}

/** 顔のない人形。seated なら座った姿勢 */
export function Figure({ x, y, z = 0, body, seated, anim }: { x: number; y: number; z?: number; body: string; seated?: boolean; anim?: string }) {
  const [sx, sy] = P(x, y, z);
  const h = seated ? 20 : 28;
  const dark = shade(body, body === '#fafbfc' ? 0.14 : 0.28);
  return (
    <g transform={`translate(${sx} ${sy})`}>
      <ellipse cx={0} cy={0} rx={9} ry={4} fill="#000" opacity={0.12} />
      <g className={anim} style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}>
        <rect x={-7} y={-h} width={14} height={h} rx={7} fill={body} />
        <path d={`M0 ${-h} a7 7 0 0 1 7 7 V -7 a7 7 0 0 1 -7 7 Z`} fill={dark} opacity={0.55} />
        <circle cx={0} cy={-h - 8} r={7.5} fill={body} />
        <path d={`M0 ${-h - 15.5} a7.5 7.5 0 0 1 0 15 z`} fill={dark} opacity={0.55} />
      </g>
    </g>
  );
}

/** 頭上に出るピル(状態表示) */
export function StatusPill({ x, y, z, children, text, tone = 'white', onClick, label }: { x: number; y: number; z: number; children?: ReactNode; text?: string; tone?: 'white' | 'coral' | 'ink'; onClick?: () => void; label?: string }) {
  const [sx, sy] = P(x, y, z);
  const bg = tone === 'coral' ? '#ff6a4d' : tone === 'ink' ? '#1d1f27' : '#ffffff';
  const fg = tone === 'white' ? '#1d1f27' : '#ffffff';
  const w = text ? 30 + text.length * 7.5 : 44;
  return (
    <g transform={`translate(${sx} ${sy})`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined} role={onClick ? 'button' : undefined} aria-label={label}>
      <g className="anim-pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <rect x={-w / 2} y={-14} width={w} height={26} rx={13} fill={bg} filter="url(#pillShadow)" />
        <g transform={`translate(${text ? -w / 2 + 8 : -9} -10)`} color={fg}>
          {children}
        </g>
        {text && (
          <text x={-w / 2 + 28} y={4} fontSize={12} fontWeight={700} fill={fg} className="num">
            {text}
          </text>
        )}
      </g>
    </g>
  );
}
