// FormFields — reusable form for CREATE and UPDATE stories.
// Usage:
// <FormFields
//   fields={[{ name: 'name', label: 'Name' }, { name: 'email', label: 'Email', type: 'email' }]}
//   initial={{ name: '', email: '' }}
//   submitLabel="Create"
//   onSubmit={(values) => ...}
// />
import { useState } from 'react';
import Button from './Button';
import FormField from './FormField';

export default function FormFields({
  fields,
  initial = {},
  submitLabel = 'Save',
  onSubmit,
  errors = {},
  disabled = false,
  isSubmitting = false,
}) {
  const [values, setValues] = useState(initial);
  const change = (event) => {
    const { name, type, value, files } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'file' ? files : value }));
  };

  return (
    <form
      className="grid max-w-2xl gap-5"
      aria-busy={isSubmitting || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      {fields.map((field) => (
        <FormField
          key={field.name}
          id={field.name}
          name={field.name}
          label={field.label}
          type={field.type || 'text'}
          options={field.options}
          value={values[field.name]}
          onChange={change}
          required={field.required}
          disabled={disabled || isSubmitting || field.disabled}
          hint={field.hint}
          error={errors[field.name]}
          accept={field.accept}
          multiple={field.multiple}
          maxLength={field.maxLength}
        />
      ))}
      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" disabled={disabled} loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
