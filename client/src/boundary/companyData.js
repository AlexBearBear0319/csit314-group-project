import { useEffect, useState } from 'react';
import { api } from '../api';
export const COMPANY_FIELDS = [
  { name:'name',label:'Company name',required:true,maxLength:255 },
  { name:'description',label:'Description',type:'textarea',maxLength:5000 },
];
export function useCompany() {
  const [attempt,setAttempt] = useState(0);
  const [result,setResult] = useState({key:null,company:null,error:''});
  useEffect(()=>{
    const controller = new AbortController();
    api.get('/companies/mine',{signal:controller.signal})
      .then(company=>{if(!controller.signal.aborted)setResult({key:attempt,company,error:''});})
      .catch(error=>{if(!controller.signal.aborted)setResult({key:attempt,company:null,error:error.message});});
    return ()=>controller.abort();
  },[attempt]);
  return {company:result.key===attempt?result.company:null,error:result.key===attempt?result.error:'',loading:result.key!==attempt,retry:()=>setAttempt(value=>value+1)};
}
