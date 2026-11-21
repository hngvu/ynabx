import React, { useId } from 'react';

export interface IconCircleProgressProps {
  percentageComplete?: number; // 0 to 100
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const IconCircleProgress: React.FC<IconCircleProgressProps> = ({
  percentageComplete = 0,
  width = 16,
  height = 16,
  className = '',
}) => {
  const clipId = useId();
  const clampedPercent = Math.min(100, Math.max(0, percentageComplete));
  const isComplete = clampedPercent >= 100;
  const isZero = clampedPercent <= 0;

  // Arc calculation for pie/circle clip path:
  // Coordinates in [-1, -1, 2, 2] box
  // Angle starts at top (-90deg), but the SVG has rotate(-90deg) via CSS .icon-circle-progress
  // So in base coordinates without rotation, 0 angle is (1, 0)
  const angle = (clampedPercent / 100) * 2 * Math.PI;
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  const largeArcFlag = clampedPercent > 50 ? 1 : 0;
  const pathD = isZero
    ? ''
    : clampedPercent >= 99.9
    ? 'M 0 0 L 1 0 A 1 1 0 1 1 0.9999 -0.001 Z'
    : `M 0 0 L 1 0 A 1 1 0 ${largeArcFlag} 1 ${x.toFixed(4)} ${y.toFixed(4)} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="-1 -1 2 2"
      className={`icon-circle-progress ${isZero ? 'zero' : ''} ${isComplete ? 'complete' : ''} ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          {isComplete ? (
            <path
              className="checkmark"
              transform="scale(.015) rotate(90) translate(-35, -28)"
              d="M62.7217 10.8417L30.1078 58.1502C29.4223 59.1438 28.4948 59.977 27.3909 60.5596C26.2858 61.1429 25.0439 61.454 23.773 61.454C22.5022 61.454 21.2603 61.1429 20.1551 60.5596C19.0513 59.977 18.1247 59.1451 17.4392 58.1515L1.27863 34.7095C0.350892 33.4061 -0.0848857 31.8439 0.0136661 30.2872C0.113302 28.7133 0.756408 27.1933 1.8757 26.0008L1.91649 25.9574L1.95863 25.9151C2.66751 25.2047 3.53559 24.6456 4.50937 24.2916C5.484 23.9373 6.53103 23.8009 7.57331 23.8971C8.61533 23.9933 9.61275 24.3184 10.4957 24.838C11.3768 25.3567 12.1179 26.0535 12.6786 26.8673L23.7732 42.9608L51.3201 3.00222C51.8809 2.18833 52.6235 1.48932 53.5048 0.970699C54.3877 0.451064 55.3851 0.126086 56.4272 0.0299405C57.4695 -0.0662309 58.5165 0.0703119 59.4911 0.424682C60.4648 0.778745 61.3328 1.33782 62.0417 2.04835L62.0837 2.09048L62.1244 2.13382C63.2435 3.32618 63.8866 4.84599 63.9863 6.41967C64.0849 7.97627 63.6493 9.53835 62.7217 10.8417Z"
            />
          ) : (
            <path d={pathD} />
          )}
        </clipPath>
      </defs>
      <circle r=".9" cx="0" cy="0" strokeWidth=".2" className="outer" />
      <circle r=".65" cx="0" cy="0" className="inner" clipPath={`url(#${clipId})`} />
    </svg>
  );
};

export default IconCircleProgress;
