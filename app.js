'use strict';
const SB='https://dsfjuhqquwwvnykqhohn.supabase.co',KEY='sb_publishable_wDJ4G1YUCqxfjEGH3h8vyQ_Ulzh-PlJ';
const CREW=['정일용','이문주','이민영'],COL={'정일용':'#2ec4b6','이문주':'#ff7a59','이민영':'#8b5cf6'};
const MODELS=['gemini-3.8-flash','gemini-3.6-flash'];
const $=id=>document.getElementById(id);
let runs=[],goal=150,who='ALL';
const H={apikey:KEY,'Content-Type':'application/json'};
async function api(path,opt={}){const r=await fetch(SB+'/rest/v1/'+path,{...opt,headers:{...H,...(opt.headers||{})}});
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok){const e=new Error((j&&j.message)||('HTTP '+r.status));e.code=j&&j.code;throw e}return j}
const rpc=(fn,body)=>api('rpc/'+fn,{method:'POST',body:JSON.stringify(body)});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtT=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}시간 ${m}분`:`${m}분 ${x}초`};
const fmtP=(sec,km)=>{if(!km)return '-';const p=Math.round(sec/km);return `${Math.floor(p/60)}'${String(p%60).padStart(2,'0')}"`};
const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const ym=d=>d.slice(0,7);
function toast(m,img='win'){const t=$('toast');t.querySelector('img').src='img/'+img+'.webp';$('toastMsg').textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3200)}

async function load(){try{
  const [r,s]=await Promise.all([api('runs?select=*&order=run_date.desc,created_at.desc&limit=5000'),api('crew_settings?select=monthly_goal&id=eq.1')]);
  runs=r.map(x=>({...x,distance:+x.distance}));goal=s[0]?+s[0].monthly_goal:150;render()}
  catch(e){console.warn(e);toast('기록을 불러오지 못했어요. 인터넷을 확인해 주세요','rest')}}

/* ---------- passcode ---------- */
const PK='vc_pass';
function askPass({title='🔐 크루 비밀번호',desc='기록을 바꾸려면 크루 비밀번호가 필요해요.',extra=null,force=false}={}){
  const saved=localStorage.getItem(PK);
  if(saved&&!force&&!extra)return Promise.resolve({pass:saved});
  return new Promise(res=>{const d=$('dlgPass');$('passTitle').textContent=title;$('passDesc').textContent=desc;$('passErr').textContent='';
    $('passIn').value=saved&&extra?saved:'';const ex=$('passExtra');ex.hidden=!extra;ex.value='';ex.placeholder=extra||'';
    const done=v=>{d.close();$('passForm').onsubmit=null;$('passCancel').onclick=null;res(v)};
    $('passForm').onsubmit=e=>{e.preventDefault();const p=$('passIn').value.trim();if(!p){$('passErr').textContent='비밀번호를 입력해 주세요';return}
      done({pass:p,extra:ex.value.trim(),remember:$('passRemember').checked})};
    $('passCancel').onclick=()=>done(null);d.showModal();setTimeout(()=>$('passIn').focus(),50)})}
async function withPass(fn,opts){for(let i=0;i<3;i++){const p=await askPass({...opts,force:i>0});if(!p)return null;
  try{const r=await fn(p.pass,p.extra);if(p.remember)localStorage.setItem(PK,p.pass);passState();return r}
  catch(e){if(e.code==='28P01'||/WRONG_PASSCODE/.test(e.message)){localStorage.removeItem(PK);passState();opts={...opts,desc:'❌ 비밀번호가 틀렸어요. 다시 입력해 주세요.'};continue}throw e}}
  toast('비밀번호가 맞지 않아요','rest');return null}
function passState(){$('passState').textContent=localStorage.getItem(PK)?'있음 ✅':'없음'}

/* ---------- render ---------- */
function filtered(){return who==='ALL'?runs:runs.filter(r=>r.runner===who)}
function render(){
  const f=filtered(),m=ym(today()),mon=runs.filter(r=>ym(r.run_date)===m);
  const dist=f.reduce((a,r)=>a+r.distance,0),sec=f.reduce((a,r)=>a+r.duration_sec,0);
  $('sDist').textContent=dist.toFixed(1);$('sTime').textContent=sec?fmtT(sec):'0';$('sPace').textContent=fmtP(sec,dist);$('sCount').textContent=f.length;
  const out=f.filter(r=>r.type==='outdoor').reduce((a,r)=>a+r.distance,0),po=dist?Math.round(out/dist*100):0;
  $('splitOut').style.width=(dist?po:50)+'%';$('splitTm').style.width=(dist?100-po:50)+'%';$('splitOutL').textContent=`🌳 야외 ${po}%`;$('splitTmL').textContent=`🏠 러닝머신 ${dist?100-po:0}%`;
  const md=(who==='ALL'?mon:mon.filter(r=>r.runner===who)).reduce((a,r)=>a+r.distance,0),g=who==='ALL'?goal:goal/3,pct=Math.min(100,md/g*100);
  $('goalNow').textContent=md.toFixed(1);$('goalMax').textContent=+g.toFixed(1);$('goalBar').style.width=pct+'%';$('goalRunner').style.left=Math.max(4,pct)+'%';
  $('goalRunner').src=pct>=100?'img/win.webp':'img/run.webp';
  $('goalMsg').textContent=pct>=100?'🎉 목표 달성! 다들 최고예요!':`목표까지 ${(g-md).toFixed(1)}km 남았어요${who==='ALL'?'':' (개인 목표 = 크루 목표 ÷ 3)'}`;
  // rank
  const rk=CREW.map(n=>({n,km:mon.filter(r=>r.runner===n).reduce((a,r)=>a+r.distance,0),c:mon.filter(r=>r.runner===n).length})).sort((a,b)=>b.km-a.km);
  $('rank').innerHTML=rk.every(x=>!x.km)?`<li class="empty" style="display:block"><img src="img/rest.webp" alt="">이번 달 첫 기록의 주인공이 되어 보세요!</li>`:
    rk.map((x,i)=>`<li><span class="medal">${['🥇','🥈','🥉'][i]}</span>${i===0&&x.km?'<img src="img/win.webp" alt="">':''}<span class="dot" style="background:${COL[x.n]}"></span><span class="nm">${x.n}</span><span class="sub">${x.c}회</span><span class="km">${x.km.toFixed(1)} km</span></li>`).join('');
  chart();best(f);hist();}
function chart(){const W=320,Hh=160,wk=8,now=new Date(today()),labels=[],data={};
  CREW.forEach(n=>data[n]=Array(wk).fill(0));
  for(const r of runs){const d=Math.floor((now-new Date(r.run_date))/864e5/7);if(d>=0&&d<wk)data[r.runner][wk-1-d]+=r.distance}
  const show=who==='ALL'?CREW:[who],mx=Math.max(5,...show.flatMap(n=>data[n])),bw=(W-30)/wk;
  let s=`<svg viewBox="0 0 ${W} ${Hh+20}" role="img" aria-label="주간 거리 차트"><line x1="24" x2="${W}" y1="${Hh}" y2="${Hh}" stroke="#eee"/>`;
  s+=`<text x="0" y="12" font-size="12" fill="#7a7190">${Math.round(mx)}</text><text x="0" y="${Hh}" font-size="12" fill="#7a7190">0</text>`;
  for(let i=0;i<wk;i++){const x0=28+i*bw,w=(bw-6)/show.length;show.forEach((n,j)=>{const h=data[n][i]/mx*(Hh-10);s+=`<rect x="${x0+j*w}" y="${Hh-h}" width="${w-1}" height="${h}" rx="3" fill="${COL[n]}"><title>${n} ${data[n][i].toFixed(1)}km</title></rect>`});
    s+=`<text x="${x0+bw/2-3}" y="${Hh+14}" font-size="12" text-anchor="middle" fill="#7a7190">${i===wk-1?'이번주':(wk-1-i)+'주전'}</text>`}
  $('chart').innerHTML=s+'</svg><div class="legend">'+show.map(n=>`<span><span class="dot" style="background:${COL[n]}"></span> ${n}</span>`).join('')+'</div>'}
function best(f){if(!f.length){$('best').innerHTML=`<div class="empty"><img src="img/rest.webp" alt="">아직 기록이 없어요</div>`;return}
  const far=f.reduce((a,b)=>b.distance>a.distance?b:a),long=f.reduce((a,b)=>b.duration_sec>a.duration_sec?b:a);
  const pc=f.filter(r=>r.distance>=1),fast=pc.length?pc.reduce((a,b)=>b.duration_sec/b.distance<a.duration_sec/a.distance?b:a):null;
  const it=(ic,t,v,r)=>`<div class="b"><span class="ic">${ic}</span><div><span class="sub">${t}</span><b>${v}</b><span class="sub">${esc(r.runner)} · ${r.run_date}</span></div></div>`;
  $('best').innerHTML=it('🛣️','최장 거리',far.distance.toFixed(2)+' km',far)+(fast?it('⚡','최고 페이스 (1km 이상)',fmtP(fast.duration_sec,fast.distance)+' /km',fast):'')+it('⏱️','최장 시간',fmtT(long.duration_sec),long)}
function hist(){const t=$('hType').value,m=$('hMonth').value;
  const ms=[...new Set(runs.map(r=>ym(r.run_date)))].sort().reverse();const cur=m;
  $('hMonth').innerHTML='<option value="">전체 기간</option>'+ms.map(x=>`<option value="${x}">${x.replace('-','년 ')}월</option>`).join('');$('hMonth').value=ms.includes(cur)?cur:'';
  const f=filtered().filter(r=>(!t||r.type===t)&&(!$('hMonth').value||ym(r.run_date)===$('hMonth').value));
  $('hist').innerHTML=f.length?f.map(r=>`<li><span class="dot" style="background:${COL[r.runner]}"></span><div class="info"><b>${esc(r.runner)}</b> · ${r.distance.toFixed(2)}km · ${fmtP(r.duration_sec,r.distance)}/km
    <div class="sub">${r.run_date} · ${r.type==='outdoor'?'🌳 야외':'🏠 러닝머신'} · ${fmtT(r.duration_sec)}${r.incline?` · 경사 ${r.incline}%`:''}${r.heart_rate?` · ❤️ ${r.heart_rate}`:''}${r.memo?` · ${esc(r.memo)}`:''}</div></div>
    <button class="del" data-id="${r.id}" aria-label="삭제">🗑️</button></li>`).join(''):`<li class="empty" style="display:block"><img src="img/rest.webp" alt="">조건에 맞는 기록이 없어요</li>`}

/* ---------- UI wiring ---------- */
function filterBar(){$('runnerFilter').innerHTML=['ALL',...CREW].map(n=>`<button data-r="${n}" class="${n===who?'on':''}">${n==='ALL'?'👟 크루 전체':`<span class="dot" style="background:${COL[n]}"></span>${n}`}</button>`).join('')}
$('runnerFilter').onclick=e=>{const b=e.target.closest('button');if(!b)return;who=b.dataset.r;if(who!=='ALL'){$('fRunner').value=who;localStorage.setItem('vc_me',who)}filterBar();render()};
$('mainTabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;document.querySelectorAll('#mainTabs button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x.id==='tab-'+b.dataset.tab));scrollTo(0,0)};
$('hType').onchange=hist;$('hMonth').onchange=hist;
$('fRunner').innerHTML=CREW.map(n=>`<option>${n}</option>`).join('');$('fRunner').value=localStorage.getItem('vc_me')||CREW[0];$('fDate').value=today();
const pv=()=>{const km=+$('fDist').value,s=(+$('fH').value||0)*3600+(+$('fM').value||0)*60+(+$('fS').value||0);$('pacePrev').textContent=km&&s?`⚡ 페이스 ${fmtP(s,km)} /km`:''};
['fDist','fH','fM','fS'].forEach(i=>$(i).addEventListener('input',pv));
document.addEventListener('focusin',e=>{if(e.target.matches('input,select'))setTimeout(()=>e.target.scrollIntoView({block:'center',behavior:'smooth'}),300)});

$('runForm').onsubmit=async e=>{e.preventDefault();
  const sec=(+$('fH').value||0)*3600+(+$('fM').value||0)*60+(+$('fS').value||0),km=+$('fDist').value;
  if(!(km>0))return toast('거리를 입력해 주세요','rest');if(!sec)return toast('시간을 입력해 주세요','rest');
  const runner=$('fRunner').value;localStorage.setItem('vc_me',runner);
  const btn=$('btnSave');btn.disabled=true;btn.textContent='저장 중…';
  try{const ok=await withPass(p=>rpc('add_run',{passcode:p,p_runner:runner,p_date:$('fDate').value,p_type:$('fType').value,p_distance:km,p_duration_sec:sec,
      p_incline:+$('fInc').value||0,p_heart_rate:+$('fHr').value||null,p_shoes:$('fShoes').value||null,p_memo:$('fMemo').value||null}));
    if(ok){toast(`${runner}님 ${km.toFixed(2)}km 기록 완료! 수고했어요 🎉`);['fDist','fM','fS','fHr','fMemo'].forEach(i=>$(i).value='');$('fH').value=0;$('fInc').value=0;pv();$('aiMsg').textContent='';
      await load();document.querySelector('#mainTabs [data-tab=dash]').click()}}
  catch(err){toast('저장 실패: '+err.message,'rest')}finally{btn.disabled=false;btn.textContent='기록 저장하기'}};
$('hist').onclick=async e=>{const b=e.target.closest('.del');if(!b)return;const r=runs.find(x=>x.id===b.dataset.id);
  if(!confirm(`${r.runner} ${r.run_date} ${r.distance}km 기록을 삭제할까요?`))return;
  try{if(await withPass(p=>rpc('delete_run',{passcode:p,p_id:r.id}).then(()=>1))){toast('삭제했어요','rest');load()}}catch(err){toast('삭제 실패: '+err.message,'rest')}};
$('btnGoal').onclick=async()=>{const v=prompt('이번 달 크루 목표 거리(km)',goal);if(v===null)return;const n=+v;if(!(n>0&&n<=5000))return toast('1~5000 사이 숫자로 입력해 주세요','rest');
  try{if(await withPass(p=>rpc('set_goal',{passcode:p,p_goal:n}).then(()=>1))){toast(`목표를 ${n}km로 바꿨어요!`);load()}}catch(err){toast(err.message,'rest')}};
const url=location.href.split('#')[0];
$('btnShare').onclick=async()=>{const m=ym(today()),mon=runs.filter(r=>ym(r.run_date)===m),tot=mon.reduce((a,r)=>a+r.distance,0);
  const text=`🏃 VibeCrew Run 이번 달 ${tot.toFixed(1)} / ${goal}km 달성 중! 오늘도 달려볼까요?`;
  if(navigator.share){try{await navigator.share({title:'VibeCrew Run',text,url})}catch(e){}}else{copy(text+'\n'+url)}};
$('btnCopy').onclick=()=>copy(url);
async function copy(t){try{await navigator.clipboard.writeText(t);toast('링크를 복사했어요! 카톡에 붙여넣어 보세요')}catch(e){prompt('아래 내용을 복사하세요',t)}}

/* settings */
$('btnSettings').onclick=()=>{document.querySelector('#dlgSettings details').open=!localStorage.getItem('vc_gemini_key');$('apiKey').value=localStorage.getItem('vc_gemini_key')||'';$('keyState').textContent=localStorage.getItem('vc_gemini_key')?'✅ 이 폰에 저장된 키가 있어요. 다시 넣을 필요 없어요.':'';passState();$('dlgSettings').showModal()};
$('btnKeySave').onclick=()=>{const k=$('apiKey').value.trim();if(!k)return toast('키를 붙여넣어 주세요','rest');localStorage.setItem('vc_gemini_key',k);toast('API 키를 이 기기에 저장했어요 🔑')};
$('apiKey').addEventListener('input',()=>{const k=$('apiKey').value.trim();if(/^AIza\S{20,}$/.test(k)){localStorage.setItem('vc_gemini_key',k);$('keyState').textContent='✅ 이 폰에 자동 저장됐어요. 다음부터는 안 넣어도 돼요.'}});
$('btnKeyDel').onclick=()=>{localStorage.removeItem('vc_gemini_key');$('apiKey').value='';toast('API 키를 지웠어요','rest')};
$('btnForget').onclick=()=>{localStorage.removeItem(PK);passState();toast('이 기기에서 비밀번호를 지웠어요','rest')};
$('btnChangePass').onclick=async()=>{try{if(await withPass((p,n)=>{if(!n||n.length<2)throw new Error('새 비밀번호는 2자 이상이어야 해요');return rpc('change_passcode',{old_passcode:p,new_passcode:n}).then(()=>{localStorage.removeItem(PK);return 1})},
  {title:'🔐 비밀번호 바꾸기',desc:'지금 비밀번호와 새 비밀번호를 입력해 주세요.',extra:'새 비밀번호 (4자 이상)'})){localStorage.removeItem(PK);passState();toast('비밀번호를 바꿨어요. 크루에게 알려 주세요!')}}catch(err){toast(err.message,'rest')}};
$('btnBackup').onclick=()=>{const b=new Blob([JSON.stringify({app:'VibeCrew Run',exported_at:new Date().toISOString(),monthly_goal:goal,runs},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`vibecrew-backup-${today()}.json`;a.click();toast(`기록 ${runs.length}개를 백업했어요 💾`)};
$('btnClear').onclick=async()=>{if(!confirm(`정말 크루 기록 ${runs.length}개를 모두 지울까요? 되돌릴 수 없어요.\n(먼저 백업을 받아 두는 걸 추천해요)`))return;
  try{const n=await withPass((p,c)=>{if(c!=='전체삭제')throw new Error('확인 문구가 달라서 취소했어요');return rpc('clear_all_runs',{passcode:p,confirm_text:c})},
    {title:'⚠️ 전체 비우기',desc:'비밀번호와 확인 문구 "전체삭제"를 입력해야 지워져요.',extra:'전체삭제 라고 입력'});
    if(n!=null){toast(`기록 ${n}개를 모두 지웠어요`,'rest');load()}}catch(err){toast(err.message,'rest')}};

/* ---------- AI photo ---------- */
const SYS=`너는 달리기 기록 분석 전문가 AI야.
업로드된 이미지는 1) 러닝머신(트레드밀) 디스플레이 화면, 2) 스마트워치(애플워치, 가민 등) 운동 완료 화면, 3) 러닝 앱(NRC, 스트라바 등) 화면 중 하나야.
사진에서 아래 항목들을 파악해서 정확한 JSON 형식으로만 응답해줘.
- type: 'treadmill' (러닝머신 기계 화면이거나 treadmill/indoor 표시가 있는 경우) 또는 'outdoor' (야외 GPS 지도나 일반 야외 러닝 화면인 경우)
- distance: 킬로미터(km) 단위의 숫자 (예: 5.21, 마일(mi)인 경우 1.609를 곱해서 km로 변환할 것)
- hours: 운동 시간 중 '시간' (없으면 0)
- minutes: 운동 시간 중 '분' (예: 28분 30초면 28)
- seconds: 운동 시간 중 '초' (예: 30)
- incline: 트레드밀 경사도 % (식별되면 숫자, 없거나 야외면 0)
- heartRate: 평균 심박수 bpm (보이면 정수, 없으면 null)
- shoes: 러닝화 정보가 보이면 문자열, 없으면 null
- note: 사진 속 특이사항(예: '가민 워치 기록 감지', '트레드밀 10km/h 페이스') 간략한 메모`;
const PROMPT='이 러닝/트레드밀 사진에서 거리(km), 운동 소요시간(시,분,초), 환경(outdoor/treadmill), 경사도, 심박수를 정확히 추출해줘.';
const SCHEMA={type:'OBJECT',properties:{type:{type:'STRING',enum:['outdoor','treadmill']},distance:{type:'NUMBER'},hours:{type:'INTEGER'},minutes:{type:'INTEGER'},seconds:{type:'INTEGER'},
  incline:{type:'NUMBER'},heartRate:{type:'INTEGER',nullable:true},shoes:{type:'STRING',nullable:true},note:{type:'STRING'}},required:['type','distance','hours','minutes','seconds']};
function shrink(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const s=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.85).split(',')[1])};img.onerror=rej;img.src=URL.createObjectURL(file)})}
$('photo').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const msg=$('aiMsg'),key=localStorage.getItem('vc_gemini_key');
  if(!key){msg.innerHTML='🙂 사진 자동 입력은 Gemini API 키가 있어야 해요. 오른쪽 위 ⚙️ 설정에서 무료 키를 넣거나, 아래에 직접 입력해 주세요!';$('fDist').focus();return}
  msg.textContent='🤖 AI가 사진을 읽는 중이에요… (5~15초)';
  try{const data=await shrink(file);let r,lastErr;
    for(const model of MODELS){r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:PROMPT},{inlineData:{mimeType:'image/jpeg',data}}]}],systemInstruction:{parts:[{text:SYS}]},generationConfig:{responseMimeType:'application/json',responseSchema:SCHEMA}})});
      if(r.ok)break;lastErr=r.status;if(r.status!==404)break}
    if(!r.ok)throw new Error(lastErr===400||lastErr===403?'API 키가 올바르지 않아요':lastErr===429?'오늘 무료 사용량을 다 썼어요':'AI 오류 '+lastErr);
    const j=await r.json(),o=JSON.parse(j.candidates[0].content.parts[0].text);
    if(!(o.distance>0))throw new Error('거리를 찾지 못했어요');
    $('fType').value=o.type==='treadmill'?'treadmill':'outdoor';$('fDist').value=(+o.distance).toFixed(2);$('fH').value=o.hours||0;$('fM').value=o.minutes||0;$('fS').value=o.seconds||0;
    $('fInc').value=o.incline||0;if(o.heartRate)$('fHr').value=o.heartRate;if(o.shoes)$('fShoes').value=o.shoes;if(o.note&&!$('fMemo').value)$('fMemo').value=o.note;pv();
    msg.textContent='✅ 자동 입력 완료! 숫자가 맞는지 한 번 확인하고 저장해 주세요.'}
  catch(err){msg.textContent=`😅 ${err.message}. 아래에 직접 입력해 주세요.`}};

filterBar();passState();load();
setInterval(()=>{if(!document.hidden)load()},20000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
