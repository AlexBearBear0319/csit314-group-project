import { ROOM_PALETTES } from './roomPalettes';

// A code-drawn concept room. It is not a photograph of a client project.
export default function RoomIllustration({ palette = 0, structure = 1, furniture = 1, details = 1 }) {
  const p = ROOM_PALETTES[palette];
  return (
    <svg viewBox="0 0 800 600" fill="none" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <path d="M70 466 400 282 738 466 400 585Z" fill="#262522" opacity=".06" />
      <g stroke="#b0b4a5" strokeWidth="1" strokeDasharray="4 6" opacity={1 - structure * .75}>
        <path d="m80 427 320-176 320 176-320 165Zm0 0V178L400 22l320 156v249M400 22v229" />
        <path d="m44 462 350 193M756 462 406 655" />
      </g>
      <g opacity={structure} transform={`translate(0 ${(1 - structure) * 20})`}>
        <path d="m80 414 320-166 320 166-320 165Z" fill={p.wood} />
        <path d="m80 414 320 165v12L80 426Zm640 0L400 579v12l320-165Z" fill={p.wood} opacity=".65" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => <path key={n} d={`M${120 + n * 40} ${393 - n * 20.7}l320 165`} stroke="#fff" opacity=".15" />)}
        <path d="M80 414V168L400 28v220Z" fill={p.wall} />
        <path d="M400 28 720 168v246L400 248Z" fill={p.shade} />
        <path d="M80 414 400 248l320 166M400 28v220" stroke="#9e9788" strokeWidth="2" opacity=".5" />
        <path d="m118 205 132-58v171l-132 66Z" fill={p.wood} />
        <path d="m127 210 114-50v151l-114 57Z" fill={p.light} />
        <path d="m184 185 0 155m-57-53 114-54" stroke={p.wood} strokeWidth="5" />
        <path d="m127 368 114-57 159 114-114 59Z" fill={p.light} opacity=".34" />
        <path d="m468 122 78 34v96l-78-39Z" fill={p.wood} />
        <path d="m476 133 62 27v78l-62-30Z" fill={p.light} />
        <path d="M489 191v-18c0-28 37-13 37 12v24Z" fill={p.fabric} opacity=".7" />
      </g>
      <g opacity={furniture} transform={`translate(0 ${(1 - furniture) * -24})`}>
        <path d="m207 408 210-107 210 112-210 113Z" fill={p.light} opacity=".9" />
        <path d="m224 409 193-98 192 102-192 103Z" stroke={p.wood} opacity=".4" />
        <path d="m395 299 164 82 87-43-166-80Z" fill={p.fabric} />
        <path d="M395 299v68l164 85v-71Z" fill={p.fabric} />
        <path d="m559 381 87-43v68l-87 46Z" fill={p.fabric} />
        <path d="M410 294v-47q0-17 17-10l203 100v31l-71 35Z" fill={p.fabric} />
        <path d="m424 257 187 92M482 277v52M546 309v54" stroke={p.light} strokeWidth="2" opacity=".35" />
        <path d="m398 339 158 81 78-40" stroke={p.light} strokeWidth="3" opacity=".3" />
        <path d="m414 377 0 17m210 21v15m-67 35v-14" stroke={p.wood} strokeWidth="8" />
        <path d="m449 303 28-16 30 15-28 17Z" fill={p.light} opacity=".65" />
        <path d="m546 350 29-15 30 15-29 17Z" fill={p.shade} />
        <path d="M302 436v40m97-30v37" stroke={p.wood} strokeWidth="10" />
        <ellipse cx="350" cy="428" rx="82" ry="40" fill={p.wood} />
        <ellipse cx="350" cy="423" rx="82" ry="40" fill={p.wall} />
        <path d="m320 410 30-15 28 14-30 16Z" fill={p.fabric} />
        <path d="m320 410 0 6 28 15 30-16v-6" stroke={p.fabric} strokeWidth="3" />
      </g>
      <g opacity={details} transform={`translate(0 ${(1 - details) * -18})`}>
        <ellipse cx="642" cy="433" rx="25" ry="13" fill="#262522" opacity=".09" />
        <path d="m616 391 10 41q15 12 31-1l9-40Z" fill={p.light} />
        <ellipse cx="641" cy="391" rx="25" ry="12" fill={p.wood} />
        <path d="M641 390v-90m0 64-25-30m25 9 22-30" stroke="#58614c" strokeWidth="4" />
        <ellipse cx="612" cy="328" rx="13" ry="25" transform="rotate(-35 612 328)" fill="#7d8767" />
        <ellipse cx="662" cy="310" rx="12" ry="27" transform="rotate(32 662 310)" fill="#697552" />
        <ellipse cx="641" cy="297" rx="13" ry="27" fill="#8b9675" />
        <path d="M292 315V166" stroke={p.wood} strokeWidth="5" />
        <path d="m265 182 14-34q13-9 26 0l16 34q-25 17-56 0Z" fill={p.light} />
        <ellipse cx="292" cy="319" rx="22" ry="10" fill={p.wood} />
        <ellipse cx="377" cy="418" rx="10" ry="5" fill={p.wood} />
        <path d="M369 412v-17q8-5 16 0v17q-8 5-16 0Z" fill={p.light} />
      </g>
    </svg>
  );
}
