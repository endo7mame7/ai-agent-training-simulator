export interface EventDef {
  week: number;
  id: 'executive' | 'news' | 'newGen' | 'veteranAway' | 'bigClient';
  title: string;
  text: string;
}

export const EVENTS: EventDef[] = [
  { week: 1, id: 'executive', title: '役員の一声', text: '「最新の大モデルを使えば一発だろう」——今週だけ、大モデルを工程4(解析チェック)で無料で試せます(任意)。' },
  { week: 8, id: 'news', title: '隣の課の社内報', text: '社内報より:全工程に大モデルを入れた隣の課、トークン代がかさみ四半期は赤字に。「賢いモデルを置けば回ると思っていた」と課長。' },
  { week: 12, id: 'newGen', title: '新世代モデル', text: '新世代モデルが登場。全等級の基礎成功率 +0.03、単価 −30%。整えたハーネスはそのまま使えます。' },
  { week: 16, id: 'veteranAway', title: 'ベテラン不在', text: 'ベテランの大森さんが今週は出張で不在。ベテランのコマはすべて0になります。' },
  { week: 20, id: 'bigClient', title: '大口の引き合い', text: '大口顧客から引き合い。評判が70以上なら、以降の需要が +2件になります。' },
];

export const eventForWeek = (week: number): EventDef | undefined => EVENTS.find((e) => e.week === week);

export const ACCIDENT_TEXTS = [
  'エージェントが部品マスタを上書きしてしまった',
  'エージェントが共有フォルダの図面を一括リネームしてしまった',
  'エージェントが解析サーバーのジョブを全部キャンセルしてしまった',
  'エージェントが承認前の図面を出図フォルダに置いてしまった',
];

export const isVeteranAway = (week: number) => eventForWeek(week)?.id === 'veteranAway';
