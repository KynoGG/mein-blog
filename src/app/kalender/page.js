'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthGate } from '@/components/ProtectedRoute';

const STORAGE_KEY = 'kynogg-kalender';
const SPORT_KEY   = 'kynogg-sport';
const ERN_KEY     = 'kynogg-ernaehrung';

const WT    = ['Mo','Di','Mi','Do','Fr','Sa','So'];
const MON   = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const MKURZ = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const FARBEN = ['#6BAF7E','#A788FA','#f59e0b','#3b82f6','#ec4899','#06b6d4','#ef4444','#f97316'];
const SFAR   = { eigener: '#6BAF7E', sport: '#A788FA', ernaehrung: '#f59e0b' };
const HH     = 56; // px per hour
const TW     = 52; // time gutter width px

function pad(n) { return String(n).padStart(2,'0'); }
function todayStr() { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function dateToStr(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseDate(s) { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function dow(date) { return (date.getDay()+6)%7; }
function dim(y,m) { return new Date(y,m+1,0).getDate(); }

function buildGrid(year, month) {
  const fd=dow(new Date(year,month,1)), din=dim(year,month), pd=dim(year,month-1);
  const c=[];
  for(let i=fd-1;i>=0;i--){const d=pd-i,m=month===0?11:month-1,y=month===0?year-1:year;c.push({date:dateToStr(new Date(y,m,d)),current:false});}
  for(let d=1;d<=din;d++) c.push({date:dateToStr(new Date(year,month,d)),current:true});
  const r=42-c.length;
  for(let d=1;d<=r;d++){const m=month===11?0:month+1,y=month===11?year+1:year;c.push({date:dateToStr(new Date(y,m,d)),current:false});}
  return c;
}

function wkStart(dateStr) {
  const d=parseDate(dateStr); d.setDate(d.getDate()-dow(d)); return dateToStr(d);
}
function wkDays(startStr) {
  const d=parseDate(startStr);
  return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return dateToStr(x);});
}
function evTop(t) { const[h,m]=t.split(':').map(Number); return (h*60+m)/60*HH; }
function evHeight(t,te) {
  if(!te) return HH;
  const[h1,m1]=t.split(':').map(Number),[h2,m2]=te.split(':').map(Number);
  return Math.max(HH*0.5,(h2*60+m2-h1*60-m1)/60*HH);
}

export default function KalenderPage() {
  const { user:_au, loading:_al } = useAuth();
  const today = todayStr();
  const now   = new Date();
  const gridRef = useRef(null);

  const [view,  setView]  = useState('woche');
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [day,   setDay]   = useState(today);
  const [events,   setEvents]   = useState([]);
  const [loaded,   setLoaded]   = useState(false);
  const [sport,    setSport]    = useState([]);
  const [ern,      setErn]      = useState([]);
  const [modal,    setModal]    = useState(false);
  const [editEv,   setEditEv]   = useState(null);
  const [pfDate,   setPfDate]   = useState('');
  const [pfTime,   setPfTime]   = useState('');

  useEffect(() => {
    try { const v=localStorage.getItem(STORAGE_KEY); if(v) setEvents(JSON.parse(v)); } catch {}
    try { const v=localStorage.getItem(SPORT_KEY);   if(v) setSport(JSON.parse(v));  } catch {}
    try { const v=localStorage.getItem(ERN_KEY);     if(v) setErn(JSON.parse(v));    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => { if(loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }, [events,loaded]);

  useEffect(() => {
    if((view==='woche'||view==='tag') && gridRef.current) {
      const top=Math.max(0,(now.getHours()-1)*HH);
      setTimeout(()=>{ if(gridRef.current) gridRef.current.scrollTop=top; },30);
    }
  }, [view]);

  const allEv = useMemo(() => {
    const ev=[...events];
    for(const s of sport) ev.push({id:`sport-${s.id}`,titel:s.sportart||'Training',datum:s.datum,uhrzeit:s.uhrzeit||null,uhrzeitEnde:null,typ:'sport',farbe:SFAR.sport,notizen:`${s.dauer?s.dauer+' Min.':''} ${s.intensitaet||''}`.trim(),readonly:true});
    for(const e of ern){if(!e.datum||ev.find(x=>x.typ==='ernaehrung'&&x.datum===e.datum))continue;ev.push({id:`ern-${e.datum}`,titel:'Ernährungsprotokoll',datum:e.datum,uhrzeit:null,uhrzeitEnde:null,typ:'ernaehrung',farbe:SFAR.ernaehrung,notizen:'',readonly:true});}
    return ev;
  }, [events,sport,ern]);

  const byDate = useMemo(()=>{const m={};for(const e of allEv){if(!m[e.datum])m[e.datum]=[];m[e.datum].push(e);}return m;},[allEv]);

  function openNew(d='',t=''){setEditEv(null);setPfDate(d||today);setPfTime(t);setModal(true);}
  function openEdit(ev){if(ev.readonly)return;setEditEv(ev);setPfDate(ev.datum);setPfTime(ev.uhrzeit||'');setModal(true);}
  function saveEv(data){
    if(editEv) setEvents(p=>p.map(e=>e.id===editEv.id?{...e,...data}:e));
    else setEvents(p=>[...p,{id:Date.now().toString(),typ:'eigener',...data}]);
    setModal(false);
  }
  function delEv(id){setEvents(p=>p.filter(e=>e.id!==id));setModal(false);}

  const ws  = wkStart(day);
  const wd  = wkDays(ws);
  const grid = useMemo(()=>buildGrid(year,month),[year,month]);

  function nav(dir) {
    if(view==='monat'){let m=month+dir,y=year;if(m<0){m=11;y--;}else if(m>11){m=0;y++;}setMonth(m);setYear(y);}
    else if(view==='woche'){const d=parseDate(ws);d.setDate(d.getDate()+dir*7);const s=dateToStr(d);setDay(s);setYear(d.getFullYear());setMonth(d.getMonth());}
    else if(view==='tag'){const d=parseDate(day);d.setDate(d.getDate()+dir);const s=dateToStr(d);setDay(s);setYear(d.getFullYear());setMonth(d.getMonth());}
    else if(view==='jahr') setYear(y=>y+dir);
  }
  function goToday(){setDay(today);setYear(now.getFullYear());setMonth(now.getMonth());}
  function goDay(ds){setDay(ds);const d=parseDate(ds);setYear(d.getFullYear());setMonth(d.getMonth());setView('tag');}

  function navTitle() {
    if(view==='monat') return `${MON[month]} ${year}`;
    if(view==='woche'){const s=parseDate(ws),e=parseDate(wd[6]);if(s.getMonth()===e.getMonth())return `${s.getDate()}–${e.getDate()} ${MON[s.getMonth()]} ${s.getFullYear()}`;return `${s.getDate()} ${MKURZ[s.getMonth()]} – ${e.getDate()} ${MKURZ[e.getMonth()]} ${e.getFullYear()}`;}
    if(view==='tag') return parseDate(day).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    return String(year);
  }

  if(_al) return null;
  if(!_au) return <AuthGate />;

  return (
    <div className="kal-app">
      {/* ── Sidebar ── */}
      <aside className="kal-sidebar">
        <div className="kal-mini-nav">
          <button onClick={()=>{let m=month-1,y=year;if(m<0){m=11;y--;}setMonth(m);setYear(y);}} className="kal-mini-nav-btn">‹</button>
          <span className="kal-mini-nav-title">{MKURZ[month]} {year}</span>
          <button onClick={()=>{let m=month+1,y=year;if(m>11){m=0;y++;}setMonth(m);setYear(y);}} className="kal-mini-nav-btn">›</button>
        </div>
        <MiniGrid grid={grid} today={today} selectedDay={day} weekDays={wd} byDate={byDate}
          onDayClick={ds=>{setDay(ds);const d=parseDate(ds);setYear(d.getFullYear());setMonth(d.getMonth());if(view!=='monat'&&view!=='jahr')setView('woche');}}
        />
        <div className="kal-sidebar-legend">
          {Object.entries(SFAR).map(([typ,color])=>(
            <span key={typ} className="kal-legend-item">
              <span className="kal-legend-dot" style={{background:color}}/>
              {typ==='eigener'?'Eigene':typ==='sport'?'Sport':'Ernährung'}
            </span>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="kal-main">
        <div className="kal-header">
          <div className="kal-header-left">
            <button onClick={goToday} className="kal-heute-btn">Heute</button>
            <button onClick={()=>nav(-1)} className="kal-arrow-btn">‹</button>
            <button onClick={()=>nav(1)}  className="kal-arrow-btn">›</button>
            <span className="kal-nav-title">{navTitle()}</span>
          </div>
          <div className="kal-header-right">
            <div className="kal-view-tabs">
              {[['tag','Tag'],['woche','Woche'],['monat','Monat'],['jahr','Jahr']].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v)} className={`kal-view-tab${view===v?' active':''}`}>{l}</button>
              ))}
            </div>
            <button onClick={()=>openNew(day)} className="kal-add-btn" title="Termin hinzufügen">+</button>
          </div>
        </div>

        <div className="kal-content">
          {view==='monat' && <MonatView grid={grid} byDate={byDate} today={today} onDayClick={goDay} onEventClick={openEdit} onNewEvent={openNew}/>}
          {view==='woche' && <WocheView weekDays={wd} byDate={byDate} today={today} now={now} gridRef={gridRef} onEventClick={openEdit} onNewEvent={openNew}/>}
          {view==='tag'   && <TagView date={day} events={byDate[day]||[]} today={today} now={now} gridRef={gridRef} onNewEvent={openNew} onEventClick={openEdit}/>}
          {view==='jahr'  && <JahrView year={year} byDate={byDate} today={today} onDayClick={goDay}/>}
        </div>
      </div>

      <button className="kal-fab" onClick={()=>openNew(day)}>＋</button>

      {modal && <EventModal initial={editEv} prefillDate={pfDate} prefillTime={pfTime} onSave={saveEv} onDelete={editEv?()=>delEv(editEv.id):null} onClose={()=>setModal(false)}/>}
      <style>{CSS}</style>
    </div>
  );
}

/* ── Mini Grid ── */
function MiniGrid({grid,today,selectedDay,weekDays,byDate,onDayClick}) {
  const wdSet = new Set(weekDays);
  return (
    <div className="kal-mini-grid">
      {WT.map(d=><div key={d} className="kal-mini-wd">{d[0]}</div>)}
      {grid.map((cell,i)=>{
        const isToday=cell.date===today, isSel=cell.date===selectedDay, inWeek=wdSet.has(cell.date)&&!isSel;
        const hasDot=(byDate[cell.date]||[]).length>0&&cell.current;
        return (
          <div key={i} className={`kal-mini-cell${!cell.current?' other':''}${isToday?' is-today':''}${isSel?' is-sel':''}${inWeek?' in-week':''}`}
            onClick={()=>cell.current&&onDayClick(cell.date)}>
            <span className="kal-mini-num">{parseInt(cell.date.split('-')[2])}</span>
            {hasDot&&<span className="kal-mini-dot"/>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Month View ── */
function MonatView({grid,byDate,today,onDayClick,onEventClick,onNewEvent}) {
  return (
    <div className="kal-monat">
      <div className="kal-monat-head">{WT.map(d=><div key={d} className="kal-monat-wd">{d}</div>)}</div>
      <div className="kal-monat-grid">
        {grid.map((cell,i)=>{
          const isToday=cell.date===today, evs=byDate[cell.date]||[];
          return (
            <div key={i} className={`kal-monat-cell${!cell.current?' other':''}${isToday?' is-today':''}${evs.length?' has-ev':''}`}
              onClick={()=>onDayClick(cell.date)}>
              <div className="kal-monat-cell-top">
                <span className={`kal-monat-dn${isToday?' today':''}`}>{parseInt(cell.date.split('-')[2])}</span>
                <button className="kal-monat-add" onClick={e=>{e.stopPropagation();onNewEvent(cell.date);}}>+</button>
              </div>
              <div className="kal-monat-evs">
                {evs.slice(0,3).map(ev=>(
                  <div key={ev.id} className="kal-monat-pill"
                    style={{background:ev.farbe+'28',color:ev.farbe,borderLeft:`2px solid ${ev.farbe}`}}
                    onClick={e=>{e.stopPropagation();onEventClick(ev);}}>
                    {ev.uhrzeit&&<span className="kal-pill-time">{ev.uhrzeit}</span>}
                    <span className="kal-pill-name">{ev.titel}</span>
                  </div>
                ))}
                {evs.length>3&&<div className="kal-monat-more">+{evs.length-3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week View ── */
function WocheView({weekDays,byDate,today,now,gridRef,onEventClick,onNewEvent}) {
  const todayIdx=weekDays.indexOf(today);
  const nowTop=(now.getHours()*60+now.getMinutes())/60*HH;

  function clickGrid(dateStr,e) {
    if(e.target!==e.currentTarget) return;
    const rect=e.currentTarget.getBoundingClientRect();
    const scrollTop=gridRef.current?.scrollTop||0;
    const y=e.clientY-rect.top+scrollTop;
    const h=Math.min(23,Math.floor(y/HH));
    const m=Math.round((y%HH)/HH*4)*15%60;
    onNewEvent(dateStr,`${pad(h)}:${pad(m)}`);
  }

  return (
    <div className="kal-woche">
      <div className="kal-woche-head">
        <div className="kal-tgutter"/>
        {weekDays.map((ds,i)=>{const d=parseDate(ds),isT=ds===today;return(
          <div key={ds} className={`kal-woche-col-head${isT?' today':''}`}>
            <span className="kal-woche-wd">{WT[i]}</span>
            <span className={`kal-woche-dn${isT?' today':''}`}>{d.getDate()}</span>
          </div>
        );})}
      </div>
      <AllDayRow weekDays={weekDays} byDate={byDate} onEventClick={onEventClick} cols={7}/>
      <div className="kal-time-scroll" ref={gridRef}>
        <TimeGrid weekDays={weekDays} byDate={byDate} todayIdx={todayIdx} nowTop={nowTop} onEventClick={onEventClick} clickGrid={clickGrid}/>
      </div>
    </div>
  );
}

/* ── Day View ── */
function TagView({date,events:evs,today,now,gridRef,onNewEvent,onEventClick}) {
  const isToday=date===today;
  const nowTop=(now.getHours()*60+now.getMinutes())/60*HH;
  const timed=evs.filter(e=>e.uhrzeit).sort((a,b)=>a.uhrzeit.localeCompare(b.uhrzeit));
  const allDay=evs.filter(e=>!e.uhrzeit);
  const d=parseDate(date);

  function clickGrid(e) {
    if(e.target!==e.currentTarget) return;
    const rect=e.currentTarget.getBoundingClientRect();
    const scrollTop=gridRef.current?.scrollTop||0;
    const y=e.clientY-rect.top+scrollTop;
    const h=Math.min(23,Math.floor(y/HH));
    const m=Math.round((y%HH)/HH*4)*15%60;
    onNewEvent(date,`${pad(h)}:${pad(m)}`);
  }

  return (
    <div className="kal-woche">
      <div className="kal-woche-head" style={{gridTemplateColumns:`${TW}px 1fr`}}>
        <div className="kal-tgutter"/>
        <div className={`kal-woche-col-head${isToday?' today':''}`} style={{justifyContent:'flex-start',paddingLeft:14,gap:10,flexDirection:'row'}}>
          <span className="kal-woche-wd">{d.toLocaleDateString('de-DE',{weekday:'short'})}</span>
          <span className={`kal-woche-dn${isToday?' today':''}`}>{d.getDate()}</span>
        </div>
      </div>
      {allDay.length>0&&(
        <div className="kal-allday-row" style={{gridTemplateColumns:`${TW}px 1fr`}}>
          <div className="kal-tgutter kal-allday-gutter">ganzt.</div>
          <div className="kal-allday-col">
            {allDay.map(ev=><div key={ev.id} className="kal-allday-pill"
              style={{background:ev.farbe+'33',color:ev.farbe,borderLeft:`3px solid ${ev.farbe}`}}
              onClick={()=>onEventClick(ev)}>{ev.titel}</div>)}
          </div>
        </div>
      )}
      <div className="kal-time-scroll" ref={gridRef}>
        <div className="kal-time-grid" style={{height:HH*24+'px'}}>
          {Array.from({length:24},(_,h)=>(
            <div key={h} className="kal-hline" style={{top:h*HH+'px'}}>
              <span className="kal-hlabel">{pad(h)}:00</span>
            </div>
          ))}
          {Array.from({length:24},(_,h)=>(
            <div key={`hh${h}`} className="kal-hline-half" style={{top:(h*HH+HH/2)+'px'}}/>
          ))}
          <div className={`kal-day-col${isToday?' today':''}`}
            style={{left:TW+'px',width:`calc(100% - ${TW}px)`}}
            onClick={clickGrid}>
            {timed.map(ev=>{
              const top=evTop(ev.uhrzeit),ht=evHeight(ev.uhrzeit,ev.uhrzeitEnde);
              return <TimedEvent key={ev.id} ev={ev} top={top} ht={ht} onClick={e=>{e.stopPropagation();onEventClick(ev);}}/>;
            })}
          </div>
          {isToday&&<NowLine top={nowTop} left={TW} width={`calc(100% - ${TW}px)`}/>}
        </div>
      </div>
    </div>
  );
}

/* ── Year View ── */
function JahrView({year,byDate,today,onDayClick}) {
  return (
    <div className="kal-jahr">
      {Array.from({length:12},(_,mi)=>{
        const g=buildGrid(year,mi);
        return (
          <div key={mi} className="kal-jahr-month">
            <div className="kal-jahr-month-title">{MKURZ[mi]}</div>
            <div className="kal-mini-grid">
              {WT.map(d=><div key={d} className="kal-mini-wd">{d[0]}</div>)}
              {g.map((cell,i)=>{
                const isT=cell.date===today,hasDot=(byDate[cell.date]||[]).length>0&&cell.current;
                return (
                  <div key={i} className={`kal-mini-cell${!cell.current?' other':''}${isT?' is-today':''}`}
                    onClick={()=>cell.current&&onDayClick(cell.date)}>
                    <span className="kal-mini-num">{parseInt(cell.date.split('-')[2])}</span>
                    {hasDot&&<span className="kal-mini-dot"/>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Shared sub-components ── */
function AllDayRow({weekDays,byDate,onEventClick,cols}) {
  const hasAny=weekDays.some(ds=>(byDate[ds]||[]).some(e=>!e.uhrzeit));
  if(!hasAny) return null;
  return (
    <div className="kal-allday-row" style={{gridTemplateColumns:`${TW}px repeat(${cols},1fr)`}}>
      <div className="kal-tgutter kal-allday-gutter">ganzt.</div>
      {weekDays.map(ds=>{
        const allevs=(byDate[ds]||[]).filter(e=>!e.uhrzeit);
        return (
          <div key={ds} className="kal-allday-col">
            {allevs.map(ev=><div key={ev.id} className="kal-allday-pill"
              style={{background:ev.farbe+'33',color:ev.farbe,borderLeft:`3px solid ${ev.farbe}`}}
              onClick={()=>onEventClick(ev)}>{ev.titel}</div>)}
          </div>
        );
      })}
    </div>
  );
}

function TimeGrid({weekDays,byDate,todayIdx,nowTop,onEventClick,clickGrid}) {
  return (
    <div className="kal-time-grid" style={{height:HH*24+'px'}}>
      {Array.from({length:24},(_,h)=>(
        <div key={h} className="kal-hline" style={{top:h*HH+'px'}}>
          <span className="kal-hlabel">{pad(h)}:00</span>
        </div>
      ))}
      {Array.from({length:24},(_,h)=>(
        <div key={`hh${h}`} className="kal-hline-half" style={{top:(h*HH+HH/2)+'px'}}/>
      ))}
      {weekDays.map((ds,ci)=>{
        const timed=(byDate[ds]||[]).filter(e=>e.uhrzeit);
        const isT=ds===weekDays[todayIdx]&&todayIdx===ci;
        return (
          <div key={ds} className={`kal-day-col${isT?' today':''}`}
            style={{left:`calc(${TW}px + (100% - ${TW}px) * ${ci} / 7)`,width:`calc((100% - ${TW}px) / 7)`}}
            onClick={e=>clickGrid(ds,e)}>
            {timed.map(ev=>{
              const top=evTop(ev.uhrzeit),ht=evHeight(ev.uhrzeit,ev.uhrzeitEnde);
              return <TimedEvent key={ev.id} ev={ev} top={top} ht={ht} onClick={e=>{e.stopPropagation();onEventClick(ev);}}/>;
            })}
          </div>
        );
      })}
      {todayIdx>=0&&<NowLine top={nowTop} left={`calc(${TW}px + (100% - ${TW}px) * ${todayIdx} / 7)`} width={`calc((100% - ${TW}px) / 7)`}/>}
    </div>
  );
}

function TimedEvent({ev,top,ht,onClick}) {
  return (
    <div className="kal-timed-ev" style={{top:top+'px',height:ht+'px',background:ev.farbe+'33',borderLeft:`3px solid ${ev.farbe}`,color:ev.farbe}} onClick={onClick}>
      <span className="kal-timed-title">{ev.titel}</span>
      {ht>=34&&<span className="kal-timed-time">{ev.uhrzeit}{ev.uhrzeitEnde?` – ${ev.uhrzeitEnde}`:''}</span>}
    </div>
  );
}

function NowLine({top,left,width}) {
  return (
    <div className="kal-now-line" style={{top:top+'px',left:typeof left==='number'?left+'px':left,width}}>
      <span className="kal-now-dot"/>
    </div>
  );
}

/* ── Event Modal ── */
const EF = {titel:'',datum:'',uhrzeit:'',uhrzeitEnde:'',notizen:'',farbe:'#6BAF7E'};

function EventModal({initial,prefillDate,prefillTime,onSave,onDelete,onClose}) {
  const [form,setForm]=useState({
    ...EF,
    ...(initial?{titel:initial.titel||'',datum:initial.datum||prefillDate,uhrzeit:initial.uhrzeit||'',uhrzeitEnde:initial.uhrzeitEnde||'',notizen:initial.notizen||'',farbe:initial.farbe||'#6BAF7E'}:{datum:prefillDate,uhrzeit:prefillTime}),
  });
  function set(k,v){setForm(p=>({...p,[k]:v}));}
  function handleSubmit(e){e.preventDefault();if(!form.titel.trim()||!form.datum)return;onSave({titel:form.titel.trim(),datum:form.datum,uhrzeit:form.uhrzeit||null,uhrzeitEnde:form.uhrzeitEnde||null,notizen:form.notizen.trim(),farbe:form.farbe});}

  return (
    <div className="kal-modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="kal-modal">
        <div className="kal-modal-head">
          <span className="kal-modal-title">{initial?'Termin bearbeiten':'Neuer Termin'}</span>
          <button onClick={onClose} className="kal-modal-x">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="kal-modal-form">
          <input className="kal-modal-input kal-modal-titel-input" value={form.titel} onChange={e=>set('titel',e.target.value)} placeholder="Titel" required autoFocus/>
          <div className="kal-modal-field">
            <label>Datum</label>
            <input className="kal-modal-input" type="date" value={form.datum} onChange={e=>set('datum',e.target.value)} required/>
          </div>
          <div className="kal-modal-row2">
            <div className="kal-modal-field">
              <label>Von</label>
              <input className="kal-modal-input" type="time" value={form.uhrzeit} onChange={e=>set('uhrzeit',e.target.value)}/>
            </div>
            <div className="kal-modal-field">
              <label>Bis</label>
              <input className="kal-modal-input" type="time" value={form.uhrzeitEnde} onChange={e=>set('uhrzeitEnde',e.target.value)}/>
            </div>
          </div>
          <div className="kal-modal-field">
            <label>Farbe</label>
            <div className="kal-color-row">
              {FARBEN.map(c=>(
                <button key={c} type="button" onClick={()=>set('farbe',c)} className="kal-color-dot"
                  style={{background:c,boxShadow:form.farbe===c?`0 0 0 2px var(--bg-card),0 0 0 4px ${c}`:'none',transform:form.farbe===c?'scale(1.2)':'scale(1)'}}/>
              ))}
            </div>
          </div>
          <div className="kal-modal-field">
            <label>Notizen</label>
            <textarea className="kal-modal-input kal-modal-notes" value={form.notizen} onChange={e=>set('notizen',e.target.value)} placeholder="Optionale Notizen…"/>
          </div>
          <div className="kal-modal-actions">
            {onDelete&&<button type="button" onClick={onDelete} className="kal-btn-del">Löschen</button>}
            <button type="button" onClick={onClose} className="kal-btn-cancel">Abbrechen</button>
            <button type="submit" className="kal-btn-save">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── CSS ── */
const CSS = `
.kal-app{display:flex;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;min-height:620px;height:calc(100vh - 160px);}

/* Sidebar */
.kal-sidebar{width:196px;flex-shrink:0;border-right:1px solid var(--border);background:var(--bg-card);padding:14px 12px;display:flex;flex-direction:column;gap:14px;}
.kal-mini-nav{display:flex;align-items:center;justify-content:space-between;}
.kal-mini-nav-title{font-size:.8125rem;font-weight:700;color:var(--text);}
.kal-mini-nav-btn{width:22px;height:22px;border:none;border-radius:50%;background:transparent;color:var(--text-muted);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;font-family:inherit;}
.kal-mini-nav-btn:hover{background:var(--bg-card-hover);}
.kal-mini-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;}
.kal-mini-wd{font-size:.6rem;font-weight:700;color:var(--text-muted);text-align:center;padding:3px 0;text-transform:uppercase;}
.kal-mini-cell{display:flex;flex-direction:column;align-items:center;padding:1px 0;border-radius:4px;cursor:pointer;gap:1px;transition:background .1s;min-height:22px;}
.kal-mini-cell:hover{background:var(--bg-card-hover);}
.kal-mini-cell.other{opacity:.3;cursor:default;}
.kal-mini-cell.other:hover{background:transparent;}
.kal-mini-num{font-size:.6875rem;line-height:1.6;color:var(--text);}
.kal-mini-cell.is-today .kal-mini-num,.kal-mini-cell.is-sel .kal-mini-num{background:var(--accent);color:#fff;border-radius:50%;width:17px;height:17px;display:flex;align-items:center;justify-content:center;font-size:.6rem;line-height:1;}
.kal-mini-cell.is-sel .kal-mini-num{opacity:.7;}
.kal-mini-cell.in-week{background:color-mix(in srgb,var(--accent) 10%,transparent);}
.kal-mini-dot{width:4px;height:4px;border-radius:50%;background:var(--accent);display:block;flex-shrink:0;}
.kal-sidebar-legend{display:flex;flex-direction:column;gap:6px;margin-top:auto;padding-top:12px;border-top:1px solid var(--border);}
.kal-legend-item{display:flex;align-items:center;gap:6px;font-size:.75rem;color:var(--text-muted);}
.kal-legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* Main */
.kal-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
.kal-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);background:var(--bg-card);flex-shrink:0;gap:8px;flex-wrap:wrap;}
.kal-header-left{display:flex;align-items:center;gap:6px;min-width:0;}
.kal-header-right{display:flex;align-items:center;gap:8px;}
.kal-heute-btn{padding:5px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.8125rem;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;white-space:nowrap;}
.kal-heute-btn:hover{background:var(--bg-card-hover);}
.kal-arrow-btn{width:27px;height:27px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;font-family:inherit;flex-shrink:0;}
.kal-arrow-btn:hover{background:var(--bg-card-hover);}
.kal-nav-title{font-size:.9375rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.kal-view-tabs{display:flex;border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden;}
.kal-view-tab{padding:4px 11px;border:none;border-right:1px solid var(--border);background:var(--bg);color:var(--text-muted);font-size:.8rem;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;}
.kal-view-tab:last-child{border-right:none;}
.kal-view-tab:hover{background:var(--bg-card-hover);color:var(--text);}
.kal-view-tab.active{background:var(--accent);color:#fff;}
.kal-add-btn{width:30px;height:30px;border:none;border-radius:50%;background:var(--accent);color:#fff;font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s;font-family:inherit;flex-shrink:0;}
.kal-add-btn:hover{opacity:.85;}
.kal-content{flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0;}

/* Month */
.kal-monat{display:flex;flex-direction:column;height:100%;}
.kal-monat-head{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border);background:var(--bg);flex-shrink:0;}
.kal-monat-wd{text-align:center;font-size:.6875rem;font-weight:700;color:var(--text-muted);padding:7px 4px;text-transform:uppercase;letter-spacing:.05em;}
.kal-monat-grid{display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:repeat(6,1fr);flex:1;border-left:1px solid var(--border);overflow:hidden;}
.kal-monat-cell{border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:4px;cursor:pointer;display:flex;flex-direction:column;transition:background .1s;overflow:hidden;}
.kal-monat-cell:hover{background:var(--bg-card-hover);}
.kal-monat-cell:hover .kal-monat-add{opacity:1;}
.kal-monat-cell.other{background:var(--bg);}
.kal-monat-cell.other .kal-monat-dn{color:var(--text-muted);opacity:.35;}
.kal-monat-cell.is-today{background:color-mix(in srgb,var(--accent) 6%,var(--bg-card));}
.kal-monat-cell-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px;flex-shrink:0;}
.kal-monat-dn{font-size:.8125rem;font-weight:600;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--text);flex-shrink:0;}
.kal-monat-dn.today{background:var(--accent);color:#fff;}
.kal-monat-add{width:16px;height:16px;border:1px solid var(--border);border-radius:50%;background:transparent;color:var(--text-muted);font-size:.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s,background .15s;font-family:inherit;}
.kal-monat-add:hover{background:var(--accent);color:#fff;border-color:var(--accent);}
.kal-monat-evs{display:flex;flex-direction:column;gap:2px;flex:1;overflow:hidden;}
.kal-monat-pill{border-radius:3px;padding:1px 5px;font-size:.68rem;font-weight:600;display:flex;align-items:center;gap:3px;overflow:hidden;white-space:nowrap;cursor:pointer;transition:opacity .1s;}
.kal-monat-pill:hover{opacity:.75;}
.kal-pill-time{flex-shrink:0;opacity:.7;font-size:.62rem;}
.kal-pill-name{overflow:hidden;text-overflow:ellipsis;}
.kal-monat-more{font-size:.62rem;color:var(--text-muted);padding:1px 4px;}

/* Week / Day shared */
.kal-woche{display:flex;flex-direction:column;height:100%;min-height:0;}
.kal-woche-head{display:grid;grid-template-columns:${TW}px repeat(7,1fr);border-bottom:1px solid var(--border);background:var(--bg-card);flex-shrink:0;}
.kal-tgutter{border-right:1px solid var(--border);background:var(--bg);}
.kal-woche-col-head{display:flex;flex-direction:column;align-items:center;padding:8px 2px 6px;border-right:1px solid var(--border);gap:2px;}
.kal-woche-col-head:last-child{border-right:none;}
.kal-woche-col-head.today{background:color-mix(in srgb,var(--accent) 5%,var(--bg-card));}
.kal-woche-wd{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);}
.kal-woche-dn{font-size:1.1rem;font-weight:700;color:var(--text);width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:50%;}
.kal-woche-dn.today{background:var(--accent);color:#fff;}
.kal-allday-row{display:grid;border-bottom:1px solid var(--border);min-height:24px;flex-shrink:0;}
.kal-allday-gutter{font-size:.55rem;font-weight:600;color:var(--text-muted);display:flex;align-items:center;justify-content:flex-end;padding:3px 6px;letter-spacing:.03em;}
.kal-allday-col{border-right:1px solid var(--border);padding:2px 2px;display:flex;flex-direction:column;gap:2px;}
.kal-allday-col:last-child{border-right:none;}
.kal-allday-pill{border-radius:3px;padding:1px 5px;font-size:.68rem;font-weight:600;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .1s;}
.kal-allday-pill:hover{opacity:.75;}
.kal-time-scroll{flex:1;overflow-y:auto;overflow-x:hidden;position:relative;min-height:0;scrollbar-width:thin;}
.kal-time-scroll::-webkit-scrollbar{width:5px;}
.kal-time-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px;}
.kal-time-grid{position:relative;width:100%;}
.kal-hline{position:absolute;left:0;right:0;border-top:1px solid var(--border);display:flex;align-items:flex-start;pointer-events:none;}
.kal-hlabel{width:46px;font-size:.6rem;font-weight:600;color:var(--text-muted);background:var(--bg);padding:0 5px;line-height:1;margin-top:-.5em;text-align:right;flex-shrink:0;}
.kal-hline-half{position:absolute;left:${TW}px;right:0;border-top:1px dashed var(--border);opacity:.4;pointer-events:none;}
.kal-day-col{position:absolute;top:0;bottom:0;border-right:1px solid var(--border);cursor:pointer;}
.kal-day-col:hover{background:color-mix(in srgb,var(--accent) 2%,transparent);}
.kal-day-col.today{background:color-mix(in srgb,var(--accent) 4%,transparent);}
.kal-timed-ev{position:absolute;left:2px;right:2px;border-radius:4px;padding:2px 5px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;gap:1px;transition:opacity .1s,filter .1s;}
.kal-timed-ev:hover{opacity:.82;filter:brightness(1.1);}
.kal-timed-title{font-size:.7rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.kal-timed-time{font-size:.6rem;opacity:.8;}
.kal-now-line{position:absolute;height:2px;background:#ef4444;z-index:10;pointer-events:none;}
.kal-now-dot{position:absolute;left:-4px;top:-4px;width:10px;height:10px;border-radius:50%;background:#ef4444;display:block;}

/* Year */
.kal-jahr{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;padding:16px;overflow-y:auto;height:100%;}
.kal-jahr-month{border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;background:var(--bg-card);}
.kal-jahr-month-title{font-size:.8125rem;font-weight:700;color:var(--text);text-align:center;margin-bottom:8px;}

/* FAB */
.kal-fab{display:none;position:fixed;bottom:80px;right:20px;width:52px;height:52px;border-radius:50%;border:none;background:var(--accent);color:#fff;font-size:1.5rem;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.35);z-index:200;font-family:inherit;align-items:center;justify-content:center;transition:transform .15s;}
.kal-fab:hover{transform:scale(1.08);}

/* Modal */
.kal-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;}
.kal-modal{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);width:100%;max-width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.45);}
.kal-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid var(--border);}
.kal-modal-title{font-size:1rem;font-weight:700;color:var(--text);}
.kal-modal-x{width:28px;height:28px;border:1px solid var(--border);border-radius:50%;background:var(--bg);color:var(--text-muted);font-size:.8125rem;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:background .15s;}
.kal-modal-x:hover{background:var(--bg-card-hover);color:var(--text);}
.kal-modal-form{padding:16px 20px 20px;display:flex;flex-direction:column;gap:13px;}
.kal-modal-titel-input{font-size:1rem;font-weight:600;border:none;border-bottom:2px solid var(--border);border-radius:0;background:transparent;padding:4px 0 8px;color:var(--text);font-family:inherit;width:100%;transition:border-color .15s;}
.kal-modal-titel-input:focus{outline:none;border-bottom-color:var(--accent);}
.kal-modal-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.kal-modal-field{display:flex;flex-direction:column;gap:4px;}
.kal-modal-field label{font-size:.75rem;font-weight:600;color:var(--text-muted);}
.kal-modal-input{padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);font-size:.875rem;font-family:inherit;transition:border-color .15s;width:100%;box-sizing:border-box;}
.kal-modal-input:focus{outline:none;border-color:var(--accent);}
.kal-modal-notes{height:68px;resize:none;}
.kal-color-row{display:flex;gap:8px;flex-wrap:wrap;}
.kal-color-dot{width:24px;height:24px;border-radius:50%;border:none;cursor:pointer;transition:transform .15s,box-shadow .15s;}
.kal-color-dot:hover{transform:scale(1.15);}
.kal-modal-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:4px;}
.kal-btn-del{padding:7px 13px;border:1px solid rgba(239,68,68,.4);border-radius:var(--radius-sm);background:rgba(239,68,68,.08);color:#ef4444;font-size:.8125rem;font-weight:600;cursor:pointer;font-family:inherit;margin-right:auto;transition:background .15s;}
.kal-btn-del:hover{background:rgba(239,68,68,.16);}
.kal-btn-cancel{padding:7px 13px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text-muted);font-size:.8125rem;font-weight:500;cursor:pointer;font-family:inherit;transition:background .15s;}
.kal-btn-cancel:hover{background:var(--bg-card-hover);color:var(--text);}
.kal-btn-save{padding:7px 16px;border:none;border-radius:var(--radius-sm);background:var(--accent);color:#fff;font-size:.8125rem;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s;}
.kal-btn-save:hover{opacity:.85;}

/* Mobile */
@media(max-width:768px){
  .kal-app{height:calc(100vh - 130px);min-height:500px;}
  .kal-sidebar{display:none;}
  .kal-fab{display:flex;}
  .kal-add-btn{display:none;}
  .kal-header{padding:8px 10px;}
  .kal-nav-title{font-size:.8125rem;}
  .kal-view-tab{padding:4px 8px;font-size:.75rem;}
  .kal-heute-btn{padding:4px 9px;font-size:.75rem;}
  .kal-woche-head{grid-template-columns:38px repeat(7,1fr);}
  .kal-allday-row{grid-template-columns:38px repeat(7,1fr);}
  .kal-woche-dn{font-size:.875rem;width:24px;height:24px;}
  .kal-hline-half{left:38px;}
  .kal-monat-cell{min-height:44px;}
  .kal-monat-pill{display:none;}
  .kal-monat-cell.has-ev .kal-monat-evs::after{content:'';display:block;width:5px;height:5px;border-radius:50%;background:var(--accent);margin:2px auto 0;}
  .kal-modal-bg{align-items:flex-end;padding:0;}
  .kal-modal{border-radius:var(--radius) var(--radius) 0 0;max-width:100%;max-height:82vh;}
  .kal-modal-form{padding:14px 16px 32px;}
}
`;
