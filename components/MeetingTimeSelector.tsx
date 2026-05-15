'use client';

const HOURS = Array.from({ length: 24 }, (_, index) => `${index}`.padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => `${index}`.padStart(2, '0'));

function splitTime(value: string) {
  const [hours = '20', minutes = '00'] = value.split(':');
  return {
    hours: HOURS.includes(hours) ? hours : '20',
    minutes: MINUTES.includes(minutes) ? minutes : '00'
  };
}

export default function MeetingTimeSelector({
  value,
  onChange,
  disabled = false,
  idPrefix = 'meeting-time'
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const { hours, minutes } = splitTime(value);

  function updateHours(nextHours: string) {
    onChange(`${nextHours}:${minutes}`);
  }

  function updateMinutes(nextMinutes: string) {
    onChange(`${hours}:${nextMinutes}`);
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:max-w-xs">
      <div>
        <label className="sr-only" htmlFor={`${idPrefix}-hours`}>Uur</label>
        <select
          id={`${idPrefix}-hours`}
          value={hours}
          onChange={(event) => updateHours(event.target.value)}
          disabled={disabled}
          className="neo-input py-3 text-center"
        >
          {HOURS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <span className="text-lg font-black text-slate-500">:</span>
      <div>
        <label className="sr-only" htmlFor={`${idPrefix}-minutes`}>Minuten</label>
        <select
          id={`${idPrefix}-minutes`}
          value={minutes}
          onChange={(event) => updateMinutes(event.target.value)}
          disabled={disabled}
          className="neo-input py-3 text-center"
        >
          {MINUTES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
