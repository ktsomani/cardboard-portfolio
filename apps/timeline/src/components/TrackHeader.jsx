import { memo } from 'react'
import { motion } from 'framer-motion'
import { EyeIcon, EyeOffIcon, LockIcon, MuteIcon, UnlockIcon, VolumeIcon } from './Icons.jsx'
import { KIND_STYLES } from './Clip.jsx'

function FlagButton({ on, onClick, onLabel, offLabel, onIcon, offIcon }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={on ? onLabel : offLabel}
      aria-pressed={on}
      className={`grid h-5 w-5 place-items-center rounded-[4px] transition-colors duration-150
        ${on ? 'text-ink-200 hover:bg-white/10' : 'text-ink-600 hover:bg-white/10 hover:text-ink-300'}`}
    >
      {on ? onIcon : offIcon}
    </button>
  )
}

function TrackHeader({ track, onToggle, onAddClip }) {
  const kind = KIND_STYLES[track.kind] ?? KIND_STYLES.video
  const audio = track.kind === 'audio'

  return (
    <div
      className={`group relative flex w-44 shrink-0 flex-col justify-center gap-1 border-r border-white/[0.06]
        px-2 transition-colors duration-150 ${track.locked ? 'opacity-60' : ''}`}
    >
      <span
        className="absolute inset-y-0 left-0 w-[2px] opacity-70"
        style={{ background: kind.ring }}
        aria-hidden
      />
      <div className="flex items-center gap-1.5 pl-1.5">
        <span className="truncate text-[12px] font-medium tracking-tight text-ink-100">
          {track.name}
        </span>
        <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onAddClip(track.id)}
            aria-label={`Add clip to ${track.name}`}
            className="grid h-5 w-5 place-items-center rounded-[4px] text-ink-400 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            +
          </button>
        </span>
      </div>
      <div className="flex items-center gap-0.5 pl-1.5">
        {audio ? (
          <FlagButton
            on={!track.muted}
            onClick={() => onToggle(track.id, 'muted')}
            onLabel="Mute track"
            offLabel="Unmute track"
            onIcon={<VolumeIcon />}
            offIcon={<MuteIcon />}
          />
        ) : (
          <FlagButton
            on={!track.hidden}
            onClick={() => onToggle(track.id, 'hidden')}
            onLabel="Hide track"
            offLabel="Show track"
            onIcon={<EyeIcon />}
            offIcon={<EyeOffIcon />}
          />
        )}
        <FlagButton
          on={!track.locked}
          onClick={() => onToggle(track.id, 'locked')}
          onLabel="Lock track"
          offLabel="Unlock track"
          onIcon={<UnlockIcon />}
          offIcon={<LockIcon />}
        />
        <span className="tabnum ml-1 font-mono text-[9.5px] text-ink-500">
          {track.clips.length}
        </span>
        {track.locked && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-auto rounded-[3px] bg-white/[0.06] px-1 text-[9px] text-ink-400"
          >
            locked
          </motion.span>
        )}
      </div>
    </div>
  )
}

export default memo(TrackHeader)
