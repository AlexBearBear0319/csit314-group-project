import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import {RecordLoadState} from '../components/RecordPanel';
import ProjectPreviewDialog from '../components/ProjectPreviewDialog';
export default function SearchCustomerIDPPg(){
  const [params,setParams]=useSearchParams();
  const keyword=params.get('keyword') || '';
  const rawPage=Number(params.get('page') || 1);
  const page=Number.isSafeInteger(rawPage) && rawPage>0 && rawPage<=1000000?rawPage:1;
  const [attempt,setAttempt]=useState(0),[result,setResult]=useState({key:null,data:null,error:''});
  const key=JSON.stringify([keyword,page,attempt]);
  const [preview,setPreview]=useState(null);
  const openRequest=useRef(0);
  useEffect(()=>{
    const controller=new AbortController();
    api.get('/customer/idps?'+new URLSearchParams({keyword,page:String(page)}),{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setResult({key,data,error:''});})
      .catch(error=>{if(!controller.signal.aborted)setResult({key,data:null,error:error.message});});
    return ()=>controller.abort();
  },[keyword,page,key]);
  useEffect(()=>()=>{openRequest.current+=1;},[]);
  const loading=result.key!==key,data=loading?null:result.data,error=loading?'':result.error;
  function search(term){setParams({keyword:term.trim(),page:'1'});setAttempt(value=>value+1);}
  async function viewProject(project){
    const request=++openRequest.current;
    setPreview({project,loading:true,error:''});
    try{const detail=await api.post('/customer/idps/'+project.id+'/view',{});if(request===openRequest.current)setPreview({project:detail,loading:false,error:''});}
    catch(failure){if(request===openRequest.current)setPreview({project,loading:false,error:failure.message});}
  }
  function closePreview(){openRequest.current+=1;setPreview(null);}
  return <section className="grid min-w-0 gap-6" aria-busy={loading}>
    <h1 className="font-display text-4xl text-ink">Search IDPs</h1>
    <SearchBar key={keyword} initialKeyword={keyword} placeholder="Search projects" onSearch={search}/>
    <RecordLoadState loading={loading} error={error} onRetry={()=>setAttempt(value=>value+1)}/>
    {data && <>
      {!data.projects.length && <p role="status">No results found.</p>}
      <div className="grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">{data.projects.map(project=><article key={project.id} className="grid min-w-0 gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="break-words font-display text-2xl">{project.name}</h2>
        <dl className="grid gap-2"><div><dt className="text-sm text-muted">Property type</dt><dd className="break-words">{project.propertyType || '—'}</dd></div>
        <div><dt className="text-sm text-muted">Design style</dt><dd className="break-words">{project.designStyle || '—'}</dd></div>
        <div><dt className="text-sm text-muted">Status</dt><dd>{project.status==='past'?'Past':'Current'}</dd></div></dl>
        <Button type="button" variant="secondary" onClick={()=>viewProject(project)}>View project</Button>
      </article>)}</div>
      <nav aria-label="Project pages" className="flex flex-wrap items-center gap-4">
        <Button type="button" variant="secondary" disabled={page<=1} onClick={()=>setParams({keyword,page:String(page-1)})}>Previous</Button>
        <span role="status">{data.total? 'Page '+page+' of '+data.totalPages+' · '+data.total+' projects':'0 projects'}</span>
        <Button type="button" variant="secondary" disabled={page>=data.totalPages} onClick={()=>setParams({keyword,page:String(page+1)})}>Next</Button>
      </nav>
    </>}
    <ProjectPreviewDialog project={preview?.project} loading={preview?.loading} error={preview?.error} onClose={closePreview}/>
  </section>;
}
