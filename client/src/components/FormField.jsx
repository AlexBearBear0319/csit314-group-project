const CONTROL_CLASS =
  'min-h-[46px] w-full rounded-control border border-border bg-white px-3 py-2.5 text-base text-ink shadow-sm placeholder:text-muted focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/20 aria-invalid:border-danger disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-muted';

export default function FormField({
  id,
  name,
  label,
  type = 'text',
  value = '',
  onChange,
  required = false,
  disabled = false,
  options,
  hint,
  error,
  autoComplete,
  minLength,
  maxLength,
  inputMode,
  pattern,
  accept,
  multiple = false,
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const sharedProps = {
    id,
    name,
    required,
    disabled,
    onChange,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
  };

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {options ? (
        <select {...sharedProps} value={value ?? ''} className={CONTROL_CLASS}>
          <option value="" />
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          {...sharedProps}
          rows={4}
          value={value ?? ''}
          className={`${CONTROL_CLASS} min-h-28 resize-y`}
        />
      ) : type === 'file' ? (
        <input
          {...sharedProps}
          type="file"
          accept={accept}
          multiple={multiple}
          className={`${CONTROL_CLASS} file:mr-3 file:rounded-control file:border-0 file:bg-action-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-action-ink`}
        />
      ) : (
        <input
          {...sharedProps}
          type={type}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          value={value ?? ''}
          className={CONTROL_CLASS}
        />
      )}
      {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
