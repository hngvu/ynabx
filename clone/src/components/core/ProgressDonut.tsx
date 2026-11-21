import React from 'react';
import { Icon } from '../core/Icon';

export interface ProgressDonutProps {
  value?: number; // 0 to 100
  className?: 'positive' | 'warning' | 'passive' | string;
}

export const ProgressDonut: React.FC<ProgressDonutProps> = ({
  value = 0,
  className = 'positive',
}) => {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  const isComplete = percent >= 100;

  // Degrees of rotation: 360 * (percent / 100)
  const deg = Math.round((percent < 2 ? 0.02 : percent / 100) * 360);
  const isOverFifty = percent > 50;

  return (
    <div className="donut-container">
      <div className="donut-wrapper">
        {isComplete ? (
          <Icon className="progress-complete-icon" name="check_circle_fill" />
        ) : (
          <span className="label">
            <span className="percent">{percent}</span>
            <span>%</span>
          </span>
        )}
        <div
          className="donut"
          style={{
            clip: isOverFifty ? 'rect(auto, auto, auto, auto)' : 'rect(0, 1em, 1em, 0.5em)',
          }}
        >
          <div
            className={`left half-circle ${className}`}
            style={{
              transform: `rotate(${deg}deg)`,
            }}
          />
          <div
            className={`right half-circle ${className}`}
            style={{
              transform: isOverFifty ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
        <div className="shadow" />
      </div>
    </div>
  );
};

export default ProgressDonut;
