// FormFields — reusable form for CREATE and UPDATE stories.
// Usage:
// <FormFields
//   fields={[{ name: 'name', label: 'Name' }, { name: 'email', label: 'Email', type: 'email' }]}
//   initial={{ name: '', email: '' }}
//   submitLabel="Create"
//   onSubmit={(values) => ...}
// />
import { useState } from 'react';

export default function FormFields({ fields, initial = {}, submitLabel = 'Save', onSubmit }) {
  const [values, setValues] = useState(initial);
  const change = (e) => setValues({ ...values, [e.target.name]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}>
      {fields.map((f) => (
        <div className="mb-3" key={f.name}>
          <label className="form-label" htmlFor={f.name}>{f.label}</label>
          {f.options ? (
            <select id={f.name} name={f.name} className="form-select"
              value={values[f.name] ?? ''} onChange={change} required={f.required}>
              <option value="">Select...</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input id={f.name} name={f.name} type={f.type || 'text'} className="form-control"
              value={values[f.name] ?? ''} onChange={change} required={f.required} />
          )}
        </div>
      ))}
      <button className="btn btn-primary" type="submit">{submitLabel}</button>
    </form>
  );
}
