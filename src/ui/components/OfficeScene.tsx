import { Check, Moon, Plus, TriangleAlert } from 'lucide-react';
import { AGENTS } from '../../game/data';
import type { AgentState } from '../../game/types';
import { Box, Figure, Flat, P, Plant, StatusPill, UNIT } from './iso';

export type AgentStatus = 'idle' | 'work' | 'wait' | 'sleep' | 'done' | 'trouble';

export const AGENT_BODY: Record<string, string> = { ai: '#fafbfc', bell: '#2a2b31', koro: '#8a94a8' };

const BLUE = '#5b8fe8';
const WHITE = '#f4f6fa';

/** 机の位置(3席) */
const DESKS = [
  { x: 1.0, y: 3.2 },
  { x: 3.7, y: 3.2 },
  { x: 6.4, y: 3.2 },
];

/** アイソメトリックのオフィス。エージェントの席をタップできる */
export function OfficeScene({
  agents,
  status,
  busy,
  onAgent,
  hireCost,
  height,
  showHire = true,
}: {
  agents: AgentState[];
  status: (id: string) => AgentStatus;
  busy: boolean;
  onAgent: (id: string) => void;
  hireCost?: boolean;
  height?: number;
  showHire?: boolean;
}) {
  // 画面範囲
  const corners = [P(-2.2, 0, 0), P(10, 0, 0), P(0, 10.6, -0.7), P(10, 10.6, -0.7), P(4, 0, 3.6), P(0, -1, 3)];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs) - 12;
  const minY = Math.min(...ys) - 30;
  const w = Math.max(...xs) - minX + 12;
  const h = Math.max(...ys) - minY + 12;

  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} width="100%" style={height ? { height } : undefined} className="block select-none" role="img" aria-label="オフィス">
      <defs>
        <filter id="pillShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* 芝生と床 */}
      <Box x={-2} y={5.6} z={-0.6} w={2} d={2.2} h={0.6} color="#5fd476" left="#3fae58" right="#349a4b" />
      <Box x={0} y={0} z={-0.6} w={9.4} d={8.4} h={0.6} color={BLUE} left="#3f6fc9" right="#3360b3" />
      <Box x={2} y={8.4} z={-0.6} w={4.2} d={2.2} h={0.6} color={BLUE} left="#3f6fc9" right="#3360b3" />
      <Flat x={4.6} y={5.2} w={4.2} d={3} color="#86b0f2" />
      <Box x={-1.7} y={6.2} w={0.5} d={0.5} h={0.7} color="#e2403a" />

      {/* 奥:グラフのボード */}
      <Box x={0.3} y={0.5} w={0.15} d={2.6} h={2} color={WHITE} right="#2f4fa8" />
      <ChartOnBoard />

      {/* 奥:サーバー(研究設備) */}
      <Box x={3.6} y={0.2} w={1.3} d={1.3} h={2.5} color="#5bc46e" left="#f1f3f7" right="#d9dee8" />
      <ServerGrill busy={busy} />

      {/* 右奥:棚 */}
      <Box x={8.4} y={0.6} w={0.8} d={2.2} h={1.7} color="#4a7fdc" left={WHITE} right="#d9dee8" />
      <Box x={8.45} y={1.2} z={1.7} w={0.3} d={0.3} h={0.5} color="#f0b84a" />

      <Plant x={0.4} y={6.9} />
      <Plant x={8.4} y={4.0} scale={0.9} />

      {/* 席 */}
      {DESKS.map((dk, i) => {
        const def = AGENTS[i];
        const owned = agents.find((a) => a.id === def.id);
        const st = owned ? status(def.id) : 'idle';
        const seated = !!owned;
        return (
          <g key={def.id} onClick={() => onAgent(def.id)} style={{ cursor: 'pointer' }} role="button" aria-label={`${def.name}の席`}>
            {/* 椅子 */}
            <Box x={dk.x + 1.1} y={dk.y - 0.95} w={0.6} d={0.6} h={0.35} color={WHITE} />
            <Box x={dk.x + 1.1} y={dk.y - 1.0} z={0.35} w={0.6} d={0.12} h={0.55} color={WHITE} />
            {owned && (
              <Figure
                x={dk.x + 1.4}
                y={dk.y - 0.55}
                z={0.35}
                body={AGENT_BODY[def.id]}
                seated={seated}
                anim={st === 'work' ? 'anim-type' : st === 'idle' ? 'anim-bob' : st === 'done' ? 'anim-hop' : st === 'trouble' ? 'anim-nudge' : undefined}
              />
            )}
            {/* 机 */}
            <Box x={dk.x} y={dk.y} w={2.1} d={1.1} h={0.75} color={WHITE} />
            <Box x={dk.x + 0.2} y={dk.y + 0.15} z={0.75} w={0.5} d={0.7} h={0.06} color="#9fb4d9" />
            <Box x={dk.x + 0.25} y={dk.y + 0.1} z={0.81} w={0.1} d={0.8} h={0.55} color="#2b4f9e" right={st === 'work' ? '#7fe3a0' : '#9cc1ff'} />
            <Box x={dk.x + 1.2} y={dk.y + 0.3} z={0.75} w={0.6} d={0.25} h={0.05} color="#d6dbe6" />
          </g>
        );
      })}

      {/* 手前:ソファとテーブル(会議スペース) */}
      <Box x={6.1} y={5.6} w={1.5} d={0.9} h={0.32} color="#4a7fdc" />
      <Box x={5.2} y={7.2} w={3.2} d={0.3} h={0.95} color={WHITE} />
      <Box x={5.2} y={7.5} w={3.2} d={0.8} h={0.45} color={WHITE} />
      <Box x={5.2} y={7.5} z={0.45} w={0.3} d={0.8} h={0.3} color={WHITE} />
      <Box x={8.1} y={7.5} z={0.45} w={0.3} d={0.8} h={0.3} color={WHITE} />

      {/* 手前:コピー機 */}
      <Box x={2.6} y={8.9} w={1.6} d={1.1} h={1.1} color={WHITE} top="#4a7fdc" />
      <Box x={2.9} y={9.1} z={1.1} w={0.9} d={0.6} h={0.08} color="#2b2c33" />
      <Plant x={5.3} y={9.4} scale={0.8} />

      {/* 吹き出しは最前面に */}
      {DESKS.map((dk, i) => {
        const def = AGENTS[i];
        const owned = agents.find((a) => a.id === def.id);
        const st = owned ? status(def.id) : 'idle';
        const seated = !!owned;
        return (
          <g key={def.id} onClick={() => onAgent(def.id)} style={{ cursor: 'pointer' }}>
            {/* 状態 */}
            {owned ? (
              st !== 'idle' && (
                <StatusPill x={dk.x + 1.4} y={dk.y - 0.55} z={seated ? 2.6 : 2.6} tone={st === 'wait' || st === 'trouble' ? 'coral' : 'white'}>
                  {st === 'work' && <WorkDots />}
                  {st === 'wait' && <TriangleAlert size={18} strokeWidth={2.5} />}
                  {st === 'trouble' && <TriangleAlert size={18} strokeWidth={2.5} />}
                  {st === 'sleep' && <Moon size={18} strokeWidth={2.5} />}
                  {st === 'done' && <Check size={18} strokeWidth={3} />}
                </StatusPill>
              )
            ) : (
              showHire && <StatusPill x={dk.x + 1.05} y={dk.y + 0.55} z={1.9} tone="ink" label={`${def.name}を採用`} text={hireCost ? String(def.hireCost) : undefined}>
                <Plus size={16} strokeWidth={3} />
              </StatusPill>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function WorkDots() {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={3 + i * 6} cy={10} r={2.4} fill="#1d1f27" className="anim-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </g>
  );
}

function ChartOnBoard() {
  // ボードの右面(x = 0.45 の面)に折れ線を描く
  const pts = [0.2, 0.8, 0.5, 1.2, 0.9, 1.5, 1.35].map((z, i) => P(0.45, 0.75 + i * 0.35, 0.3 + z * 0.9));
  return (
    <g>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

function ServerGrill({ busy }: { busy: boolean }) {
  // サーバーの左面(y = 1.5 の面)にランプを並べる
  const dots: [number, number][] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) dots.push([3.85 + c * 0.32, 0.6 + r * 0.32]);
  return (
    <g>
      {dots.map(([x, z], i) => {
        const [sx, sy] = P(x, 1.5, z);
        return <circle key={i} cx={sx} cy={sy} r={2.3} fill={busy ? '#7fe3a0' : '#c8ced9'} className={busy ? 'anim-pulse' : undefined} style={busy ? { animationDelay: `${(i % 5) * 0.15}s` } : undefined} />;
      })}
    </g>
  );
}

export const UNIT_PX = UNIT;
