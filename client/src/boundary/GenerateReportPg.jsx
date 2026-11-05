import { useRef,useState } from 'react';
import { api } from '../api';
import Button from '../components/Button';
import FormField from '../components/FormField';
import Message from '../components/Message';
import DetailsView from '../components/DetailsView';
function singaporeDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function labelDate(value){return new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',day:'numeric',month:'short',year:'numeric'}).format(new Date(value));}
export default function GenerateReportPg(){
  const [period,setPeriod]=useState('daily'),[date,setDate]=useState(singaporeDate),[month,setMonth]=useState(()=>singaporeDate().slice(0,7));
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[report,setReport]=useState(null);
  const pending=useRef(false);
  function displaySuccess(data){setReport(data);}
  function displayError(failure){setError(failure.message);}
  async function generateReport(event){
    event.preventDefault();if(pending.current)return;
    pending.current=true;setSaving(true);setError('');setReport(null);
    try{displaySuccess(await api.get('/reports?'+new URLSearchParams({period,date:period==='monthly'?month+'-01':date})));}
    catch(failure){displayError(failure);}
    finally{pending.current=false;setSaving(false);}
  }
  return <section className="grid min-w-0 gap-6">
    <h1 className="font-display text-4xl text-ink">Reports</h1>
    <form onSubmit={generateReport} className="grid max-w-2xl gap-5" aria-busy={saving}>
      <FormField id="report-period" label="Period" required value={period} disabled={saving} onChange={event=>{setPeriod(event.target.value);setReport(null);}}
        options={[{value:'daily',label:'Daily'},{value:'weekly',label:'Weekly'},{value:'monthly',label:'Monthly'}]}/>
      {period==='monthly'?<FormField id="report-month" label="Month" type="month" required value={month} disabled={saving} onChange={event=>{setMonth(event.target.value);setReport(null);}}/>:
        <FormField id="report-date" label={period==='weekly'?'Date in week':'Date'} type="date" required value={date} disabled={saving} onChange={event=>{setDate(event.target.value);setReport(null);}}/>}
      <Button type="submit" loading={saving}>Generate report</Button>
    </form>
    <Message type="error" text={error}/>
    {report && <section className="rounded-panel border border-border bg-surface p-6 shadow-card" aria-label="Generated report">
      <h2 className="font-display text-2xl">{report.period[0].toUpperCase()+report.period.slice(1)} report</h2>
      <p>{labelDate(report.start)} – {labelDate(new Date(new Date(report.endExclusive).getTime()-1).toISOString())} (Singapore)</p>
      <h3 className="mt-6 font-display text-xl">Records created in this period</h3>
      <DetailsView item={report.counts} fields={[{key:'accounts',label:'User accounts'},{key:'companies',label:'Companies'},{key:'categories',label:'IDP categories'},{key:'projects',label:'Projects'},{key:'currentProjects',label:'Currently marked current'},{key:'pastProjects',label:'Currently marked past'}]}/>
    </section>}
  </section>;
}
