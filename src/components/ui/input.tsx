import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export interface FieldProps {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, name, hint, error, required, className, ...props }: InputProps) {
  const id = props.id ?? name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {label}
        {required && <span className="text-clay-600"> *</span>}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          "h-11 rounded-xl border bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400",
          "focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none",
          error ? "border-red-400" : "border-stone-300",
          className,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export interface SelectProps extends FieldProps {
  options: { value: string; label: string }[];
  defaultValue?: string;
}

export function Select({ label, name, hint, error, required, options, defaultValue }: SelectProps) {
  const id = name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-800">
        {label}
        {required && <span className="text-clay-600"> *</span>}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 rounded-xl border bg-white px-3 text-sm text-stone-900",
          "focus:border-clay-500 focus:ring-2 focus:ring-clay-200 focus:outline-none",
          error ? "border-red-400" : "border-stone-300",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
