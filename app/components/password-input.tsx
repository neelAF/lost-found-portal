"use client";

import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
};

export function PasswordInput({
  inputClassName = "",
  className = "",
  disabled,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className={`password-input-shell relative ${className}`}>
      <input
        {...props}
        disabled={disabled}
        type={isVisible ? "text" : "password"}
        className={`glass-input w-full rounded-[1.35rem] px-4 py-4 pr-14 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] ${inputClassName}`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsVisible((current) => !current)}
        className="password-toggle-button absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={isVisible ? "Hide password" : "Show password"}
        title={isVisible ? "Hide password" : "Show password"}
      >
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2.1} />
      </button>
    </div>
  );
}
