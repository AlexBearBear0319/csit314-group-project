const VARIANTS = {
  primary: 'border-transparent bg-action text-white hover:bg-action-hover',
  secondary: 'border-border bg-surface text-ink hover:bg-surface-hover',
  success: 'border-transparent bg-action text-white hover:bg-action-hover',
  danger: 'border-danger bg-danger text-white hover:opacity-90',
  warning: 'border-border bg-surface text-ink hover:bg-surface-hover',
  info: 'border-border bg-surface text-ink hover:bg-surface-hover',
  light: 'border-border bg-white text-ink hover:bg-surface-hover',
  dark: 'border-ink bg-ink text-white hover:opacity-90',
  'outline-primary': 'border-action bg-transparent text-action hover:bg-action-soft',
  'outline-secondary': 'border-border bg-transparent text-ink hover:bg-surface-hover',
  'outline-success': 'border-action bg-transparent text-action hover:bg-action-soft',
  'outline-danger': 'border-danger bg-transparent text-danger hover:bg-danger-soft',
  'outline-warning': 'border-border bg-transparent text-ink hover:bg-surface-hover',
  'outline-info': 'border-border bg-transparent text-ink hover:bg-surface-hover',
  'outline-light': 'border-border bg-transparent text-ink hover:bg-surface-hover',
  'outline-dark': 'border-ink bg-transparent text-ink hover:bg-surface-hover',
  link: 'border-transparent bg-transparent text-action underline decoration-transparent shadow-none hover:decoration-current',
};

const SIZES = {
  sm: 'min-h-10 px-3 py-2 text-xs',
  md: 'min-h-[46px] px-4 py-2.5 text-sm',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.secondary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      {...props}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-control border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-55 ${sizeClass} ${variantClass} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      )}
      {children}
    </button>
  );
}
