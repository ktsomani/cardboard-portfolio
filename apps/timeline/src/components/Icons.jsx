/**
 * Hand-rolled icon set. A dependency the size of an icon library is not worth
 * it for ~20 glyphs, and hand-drawn paths let me keep stroke weight consistent
 * with the rest of the interface (1.6px, rounded, 24-grid).
 */

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const Svg = ({ children, size = 16, ...rest }) => (
  <svg {...base} width={size} height={size} {...rest}>
    {children}
  </svg>
)

export const PlayIcon = (p) => (
  <Svg {...p}>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" stroke="none" />
  </Svg>
)

export const PauseIcon = (p) => (
  <Svg {...p}>
    <rect x="6.5" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.5" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none" />
  </Svg>
)

export const SkipStartIcon = (p) => (
  <Svg {...p}>
    <path d="M18 5v14L8 12l10-7Z" fill="currentColor" stroke="none" />
    <path d="M6 5v14" />
  </Svg>
)

export const SkipEndIcon = (p) => (
  <Svg {...p}>
    <path d="M6 5v14l10-7L6 5Z" fill="currentColor" stroke="none" />
    <path d="M18 5v14" />
  </Svg>
)

export const ScissorsIcon = (p) => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="6" cy="18" r="2.4" />
    <path d="M20 4 8.6 15.4M8.6 8.6 20 20" />
  </Svg>
)

export const CopyIcon = (p) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5A1.5 1.5 0 0 0 5.5 15" />
  </Svg>
)

export const TrashIcon = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
    <path d="M6.5 7l.8 12.1A1.6 1.6 0 0 0 8.9 20.6h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
    <path d="M10.5 11v6M13.5 11v6" />
  </Svg>
)

export const MagnetIcon = (p) => (
  <Svg {...p}>
    <path d="M6 4v7a6 6 0 0 0 12 0V4" />
    <path d="M6 9h4M14 9h4" />
    <path d="M6 4h4M14 4h4" />
  </Svg>
)

export const UndoIcon = (p) => (
  <Svg {...p}>
    <path d="M4 9h9.5a5.5 5.5 0 0 1 0 11H9" />
    <path d="M7.5 5.5 4 9l3.5 3.5" />
  </Svg>
)

export const RedoIcon = (p) => (
  <Svg {...p}>
    <path d="M20 9h-9.5a5.5 5.5 0 0 0 0 11H15" />
    <path d="M16.5 5.5 20 9l-3.5 3.5" />
  </Svg>
)

export const RippleIcon = (p) => (
  <Svg {...p}>
    <path d="M3 12h4M10 5.5v13M14 8v8M18 10.5v3" />
  </Svg>
)

export const ZoomInIcon = (p) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5M10.5 8v5M8 10.5h5" />
  </Svg>
)

export const ZoomOutIcon = (p) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M15 15l5 5M8 10.5h5" />
  </Svg>
)

export const LockIcon = (p) => (
  <Svg {...p} width={13} height={13}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
  </Svg>
)

export const UnlockIcon = (p) => (
  <Svg {...p} width={13} height={13}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2" />
  </Svg>
)

export const EyeIcon = (p) => (
  <Svg {...p} width={13} height={13}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
)

export const EyeOffIcon = (p) => (
  <Svg {...p} width={13} height={13}>
    <path d="M4 5l16 14" />
    <path d="M9.5 6.2A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.6 3.3M6.4 8.1A16.6 16.6 0 0 0 2.5 12S6 18 12 18a9.9 9.9 0 0 0 3.6-.7" />
  </Svg>
)

export const VolumeIcon = (p) => (
  <Svg {...p} width={13} height={13}>
    <path d="M5 9.5h3l4-3.5v12l-4-3.5H5Z" />
    <path d="M15.5 9a4 4 0 0 1 0 6" />
  </Svg>
)

export const MuteIcon = (p) => (
  <Svg {...p} width={13} height={13}>
    <path d="M5 9.5h3l4-3.5v12l-4-3.5H5Z" />
    <path d="M15.5 10l4 4M19.5 10l-4 4" />
  </Svg>
)

export const PlusIcon = (p) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
)

export const SparkIcon = (p) => (
  <Svg {...p}>
    <path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5Z" />
    <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
  </Svg>
)

export const ArrowLeftIcon = (p) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
)

export const CursorIcon = (p) => (
  <Svg {...p}>
    <path d="M5.5 3.8 19 11.2l-5.9 1.6-2.6 5.7L5.5 3.8Z" />
  </Svg>
)
