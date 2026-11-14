import React from 'react'

export interface FireSignalIconProps {
  size?: number
  className?: string
  withBackground?: boolean
}

/**
 * FireSignalIcon
 * Precision vector icon featuring the "FS" monogram woven with an
 * orbital satellite-sensor track and telemetry beacon.
 */
export const FireSignalIcon: React.FC<FireSignalIconProps> = ({
  size = 36,
  className = '',
  withBackground = true,
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      role="img"
      aria-label="FireSignal Logo Icon"
    >
      {/* Dark Obsidian Instrument Badge */}
      {withBackground && (
        <>
          <rect width="32" height="32" rx="7.5" fill="#0B0E11" />
          <rect
            x="0.75"
            y="0.75"
            width="30.5"
            height="30.5"
            rx="6.75"
            fill="#13171C"
            stroke="#252D34"
            strokeWidth="1.25"
          />
        </>
      )}

      {/* Subtle Cardinal Reticle Ticks */}
      <line x1="16" y1="2" x2="16" y2="4.5" stroke="#252D34" strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="27.5" x2="16" y2="30" stroke="#252D34" strokeWidth="1" strokeLinecap="round" />
      <line x1="2" y1="16" x2="4.5" y2="16" stroke="#252D34" strokeWidth="1" strokeLinecap="round" />
      <line x1="27.5" y1="16" x2="30" y2="16" stroke="#252D34" strokeWidth="1" strokeLinecap="round" />

      {/* Orbital Satellite Trajectory Track */}
      <path
        d="M 5.5 22.5 C 4.5 15.5 10.5 7.5 19.5 7 C 22.5 6.8 25.5 8 26.5 10.5"
        stroke="#F0A34A"
        strokeWidth="1.2"
        strokeDasharray="2 2"
        opacity="0.65"
        strokeLinecap="round"
      />

      {/* Satellite Optical Sensor Beacon */}
      <circle cx="19.5" cy="7" r="1.5" fill="#F0A34A" />
      <circle cx="19.5" cy="7" r="3.2" stroke="#F0A34A" strokeWidth="0.75" opacity="0.4" />

      {/* F Monogram (Structural Near-White #E8EDF0) */}
      <path
        d="M 8.5 7.5 L 8.5 24.5 M 8.5 7.5 L 16.5 7.5 M 8.5 14 L 14.5 14"
        stroke="#E8EDF0"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* S Monogram (Amber Satellite Signal Wave #F0A34A) */}
      <path
        d="M 23 10 C 23 7.8 19.5 7.2 17 8.5 C 14.5 9.8 14 13.5 17.5 15 C 22 17 22.8 20.8 19.8 23 C 16.8 24.8 13.5 23.5 13 22"
        stroke="#F0A34A"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface FireSignalLogoLockupProps {
  iconSize?: number
  showDescriptor?: boolean
  descriptorText?: string
  className?: string
}

/**
 * FireSignalLogoLockup
 * Horizontal brand lockup featuring the icon, two-tone wordmark,
 * and scientific descriptor.
 */
export const FireSignalLogoLockup: React.FC<FireSignalLogoLockupProps> = ({
  iconSize = 38,
  showDescriptor = true,
  descriptorText = 'Satellite Fire Intelligence',
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <FireSignalIcon size={iconSize} />
      <div className="flex flex-col">
        <span className="text-lg sm:text-xl font-bold tracking-tight text-[#E8EDF0] leading-tight">
          Fire<span className="text-[#F0A34A]">Signal</span>
        </span>
        {showDescriptor && (
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#9BA8B2] leading-none mt-0.5">
            {descriptorText}
          </span>
        )}
      </div>
    </div>
  )
}

export default FireSignalIcon
