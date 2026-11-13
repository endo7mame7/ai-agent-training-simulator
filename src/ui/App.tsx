import { useCallback } from 'react';
import { useGame } from '../store/gameStore';
import { HowTo } from './components/HowTo';
import { Playback } from './components/Playback';
import { StageDetail } from './components/StageDetail';
import { Toast } from './components/Toast';
import { TopBar } from './components/TopBar';
import { KnacksScreen } from './screens/KnacksScreen';
import { MainScreen } from './screens/MainScreen';
import { ReportScreen } from './screens/ReportScreen';
import { ResultScreen } from './screens/ResultScreen';
import { StaffScreen } from './screens/StaffScreen';
import { TitleScreen } from './screens/TitleScreen';

export function App() {
  const { screen, game, selectedStage, playing, howToOpen, finishPlayback } = useGame();
  const done = useCallback(() => finishPlayback(), [finishPlayback]);
  if (screen === 'title' || !game)
    return (
      <>
        <TitleScreen />
        {howToOpen && <HowTo />}
      </>
    );
  return (
    <div className="min-h-full">
      <TopBar />
      {screen === 'main' && <MainScreen />}
      {screen === 'staff' && <StaffScreen />}
      {screen === 'knacks' && <KnacksScreen />}
      {screen === 'report' && <ReportScreen />}
      {screen === 'result' && <ResultScreen />}
      {selectedStage !== null && <StageDetail stageId={selectedStage} />}
      {playing && <Playback report={playing} onDone={done} />}
      {howToOpen && <HowTo />}
      <Toast />
    </div>
  );
}
