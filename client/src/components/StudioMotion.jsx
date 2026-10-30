import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Player } from '@remotion/player';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import RoomIllustration from './RoomIllustration';
import { ROOM_PALETTES } from './roomPalettes';

const DURATION = 120;
const reducedQuery = '(prefers-reduced-motion: reduce)';
// Track the system setting even when it changes while this page is open.
function subscribeMotion(callback) {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function prefersReducedMotion() { return window.matchMedia(reducedQuery).matches; }

function RoomComposition({ palette }) {
  // Remotion supplies the frame. Use seconds below so the reveal keeps its
  // timing if the frame rate changes: structure, furniture, then small details.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = (start, end) => interpolate(frame / fps, [start, end], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return <RoomIllustration palette={palette} structure={reveal(0, 1)} furniture={reveal(.8, 2)} details={reveal(1.8, 3.2)} />;
}

export default function StudioMotion() {
  const playerRef = useRef(null);
  const reduced = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => true);
  const [palette, setPalette] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Read playback events from the player so the button shows its real state.
    const player = playerRef.current;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onPause);
    if (reduced) {
      // Keep the finished room visible without moving it.
      player.pause();
      player.seekTo(DURATION - 1);
    }
    return () => {
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('ended', onPause);
    };
  }, [reduced]);

  function togglePlayback() {
    const player = playerRef.current;
    if (player.isPlaying()) player.pause();
    else {
      // At the end, Play starts the reveal again. Midway, it resumes.
      if (player.getCurrentFrame() >= DURATION - 1) player.seekTo(0);
      player.play();
    }
  }

  return (
    <section className="studio-study" aria-labelledby="material-study-title">
      <div className="studio-study-heading">
        <h2 id="material-study-title">Material study</h2>
        <span className="studio-index" aria-hidden="true">01 — 03</span>
      </div>
      <div className="studio-room" role="img" aria-label={`Living room concept in ${ROOM_PALETTES[palette].name.toLowerCase()}`}>
        <Player ref={playerRef} component={RoomComposition} inputProps={{ palette }}
          durationInFrames={DURATION} fps={30} compositionWidth={800} compositionHeight={600}
          initialFrame={DURATION - 1} controls={false} clickToPlay={false}
          doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false}
          style={{ width: '100%' }} />
      </div>
      <div className="studio-material-controls">
        <div role="group" aria-label="Room materials" className="studio-swatches">
          {ROOM_PALETTES.map((item, index) => (
            <button key={item.name} type="button" aria-pressed={palette === index}
              aria-label={item.name} title={item.name} className="studio-swatch button-feedback"
              onClick={() => setPalette(index)}>
              <span style={{ background: `linear-gradient(135deg, ${item.fabric} 0 50%, ${item.wood} 50% 100%)` }} />
            </button>
          ))}
          <span className="studio-material-name" aria-live="polite">{ROOM_PALETTES[palette].name}</span>
        </div>
        {!reduced && <button type="button" className="studio-play button-feedback" onClick={togglePlayback} aria-label={playing ? 'Pause room animation' : 'Play room animation'}>
          <span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span> {playing ? 'Pause' : 'Play'}
        </button>}
      </div>
    </section>
  );
}
