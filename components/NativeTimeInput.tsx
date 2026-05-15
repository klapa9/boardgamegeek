'use client';

import { useRef } from 'react';

type PickerCapableInput = HTMLInputElement & {
  showPicker?: () => void;
};

export default function NativeTimeInput({
  value,
  onChange,
  disabled = false,
  required = false,
  className = 'neo-input w-full sm:max-w-xs',
  id
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}) {
  const inputRef = useRef<PickerCapableInput>(null);

  function keepInputVisible(behavior: ScrollBehavior = 'auto') {
    const input = inputRef.current;
    if (!input) return;

    requestAnimationFrame(() => {
      input.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior
      });
    });
  }

  function openNativePicker() {
    const input = inputRef.current;
    if (!input || disabled) return;

    keepInputVisible();
    window.setTimeout(() => {
      input.focus({ preventScroll: true });
      try {
        input.showPicker?.();
      } catch {
        // Some browsers expose the input but not programmatic picker opening.
      }
    }, 24);
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="time"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => keepInputVisible('smooth')}
      onPointerDownCapture={() => keepInputVisible()}
      onClick={openNativePicker}
      disabled={disabled}
      required={required}
      className={className}
    />
  );
}
