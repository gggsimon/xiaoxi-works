
/* ===== 九维排盘·交叉解读（汇总六引擎 → AI 按九维框架交叉） ===== */
(function(){
'use strict';
if (typeof registerTool==='undefined' || typeof ASTRO==='undefined' || typeof iztro==='undefined') return;

const GAN_W={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const ZHI_W={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const GEN={木:'火',火:'土',土:'金',金:'水',水:'木'};
const KO={木:'土',土:'水',水:'火',火:'金',金:'木'};
const ganIdx=g=>'甲乙丙丁戊己庚辛壬癸'.indexOf(g);
function shiShen(gan,dg){
  const me=GAN_W[dg],o=GAN_W[gan];
  const sp=(ganIdx(gan)%2)===(ganIdx(dg)%2);
  if(o===me)return sp?'比肩':'劫财';
  if(GEN[o]===me)return sp?'偏印':'正印';
  if(GEN[me]===o)return sp?'食神':'伤官';
  if(KO[o]===me)return sp?'七杀':'正官';
  if(KO[me]===o)return sp?'偏财':'正财';
  return '';
}
function dRoot(n){let s=0;String(n).split('').forEach(c=>s+=+c);return s;}
function lingNum(y,m,d){let t=dRoot(y)+dRoot(m)+dRoot(d);while(t>9)t=dRoot(t);return t;}
function layerNum(n){let t=dRoot(n);while(t>9)t=dRoot(t);return t;}
function izIdx(hour,lateZi){return hour===23?(lateZi==='swap'?12:0):hour===0?0:Math.floor((hour+1)/2);}

registerTool({
  id:'ninedim',cat:'命理',name:'九维解读',glyph:'九',desc:'八字·紫微·西占·印占·灵数·称骨一次排齐，AI 九维交叉',
  render(el){
    const _p=loadProfile();
    const st=_p&&_p.year
      ?{year:_p.year,month:_p.month,day:_p.day,hour:_p.hour!=null?_p.hour:12,minute:_p.minute||0,gender:_p.gender||'男',lon:_p.lon||116.4,lat:_p.lat||36.6,tz:8,tst:false,lateZi:'day'}
      :{year:1996,month:10,day:2,hour:23,minute:30,gender:'男',lon:116.4,lat:36.6,tz:8,tst:false,lateZi:'day'};
    const out=h('div',{class:'panel'});

    function build(su){
      const R={};let lunar;
      /* 八字 */
      try{
        const solar=toSolar(su);lunar=solar.getLunar();
        const ec=lunar.getEightChar();
        const bp=baziPillars(ec,su.hour,su.lateZi||'day');
        const pillars=bp.pillars,dg=pillars[2][0];
        const wux={木:0,火:0,土:0,金:0,水:0};
        pillars.forEach(gz=>{wux[GAN_W[gz[0]]]++;wux[ZHI_W[gz[1]]]++;});
        const wuxTxt=Object.entries(wux).sort((a,b)=>b[1]-a[1]).map(kv=>kv[0]+kv[1]).join(' ');
        const thisY=new Date().getFullYear();
        const yunData=[];let curYun=null;
        try{
          const dy=ec.getYun(su.gender==='男'?1:0);
          dy.getDaYun().forEach(d=>{
            if(d.getStartYear()==null)return;
            const gz=d.getGanZhi();const ss=gz?shiShen(gz[0],dg):'';
            yunData.push({start:d.getStartYear(),age:d.getStartAge(),gz,ss});
            if(d.getStartYear()<=thisY&&curYun===null&&ss)curYun=gz+'（'+ss+'）';
          });
        }catch(e){}
        const lnData=[];
        for(let i=0;i<8;i++){const y=thisY+i;const gz=LunarYear.fromYear(y).getGanZhi();lnData.push({y,gz,ss:shiShen(gz[0],dg)});}
        R.bazi={pillars,dg,wux:wuxTxt,shengXiao:lunar.getYearShengXiao(),currentYun:curYun,dayun:yunData,liunian:lnData};
      }catch(e){R.bazi={error:e.message};}

      /* 紫微 */
      try{
        const ds=su.year+'-'+String(su.month).padStart(2,'0')+'-'+String(su.day).padStart(2,'0');
        const a=iztro.astro.bySolar(ds,izIdx(su.hour,su.lateZi),su.gender);
        const P=a.palaces;const mut4=[];
        P.forEach(p=>['majorStars','minorStars'].forEach(k=>(p[k]||[]).forEach(s=>{if(s.mutagen)mut4.push(s.mutagen+s.name);})));
        mut4.sort((x,y)=>'禄权科忌'.indexOf(x[0])-'禄权科忌'.indexOf(y[0]));
        R.ziwei={soulPalace:a.earthlyBranchOfSoulPalace,ju:a.fiveElementsClass,soul:a.soul,body:a.body,mut4,
          palaces:P.map(p=>({name:p.name,major:(p.majorStars||[]).map(s=>s.name),minor:(p.minorStars||[]).map(s=>s.name)}))};
      }catch(e){R.ziwei={error:e.message};}

      /* 共用 JD + 行星 */
      let planets=null,jd=0,T=0;
      try{
        jd=ASTRO.julianDay(su.year,su.month,su.day,su.hour+su.minute/60-su.tz);
        T=(jd-2451545.0)/36525;planets=ASTRO.computePlanets(T);
      }catch(e){}

      /* 西洋占星 */
      try{
        const hs=ASTRO.placidusCusps(jd,su.lat,su.lon);
        planets.forEach(p=>p.house=ASTRO.houseOf(p.lon,hs.cusps));
        const asp=ASTRO.findAspects(planets,6);
        const s=planets.find(p=>p.key==='Sun'),m=planets.find(p=>p.key==='Moon');
        R.xzhan={sun:ASTRO.zodiacStr(s.lon).str,moon:ASTRO.zodiacStr(m.lon).str,asc:ASTRO.zodiacStr(hs.cusps[0]).str,
          planets:planets.map(p=>({name:p.name,sign:ASTRO.zodiacStr(p.lon).str,house:p.house,retro:!!p.retro})),
          aspects:asp.slice(0,10).map(x=>({pair:x.a+' '+x.asp+' '+x.b,orb:+x.orb.toFixed(1)}))};
      }catch(e){R.xzhan={error:e.message};}

      /* 印度占星 */
      try{
        const ayan=VEDIC.ayanamsa(jd);
        const sid=planets.map(p=>Object.assign({},p,{sid:ASTRO.norm360(p.lon-ayan)}));
        const mp=sid.find(p=>p.key==='Moon'),sp=sid.find(p=>p.key==='Sun');
        const mn=VEDIC.nakshatraOf(mp.sid),sn=VEDIC.nakshatraOf(sp.sid);
        const dasha=VEDIC.dashaList(mp.sid,jd,su.year);
        const nowJD=Date.now()/86400000+2440587.5;
        const cd=dasha.list.find(d=>nowJD>=d.fromJD&&nowJD<d.toJD);
        const lagna=ASTRO.norm360(ASTRO.ascMc(jd,su.lat,su.lon).ASC-ayan);
        R.yinzhan={moonNak:mn.n+' '+mn.zh,pada:mn.pada,sunNak:sn.n+' '+sn.zh,ayanamsa:+ayan.toFixed(2),lagna:ASTRO.zodiacStr(lagna).str,
          curDasha:cd?{lord:cd.lordZh,from:VEDIC.jd2date(cd.fromJD),to:VEDIC.jd2date(cd.toJD),remain:+((cd.toJD-nowJD)/365.25).toFixed(1)}:null,
          dasha:dasha.list.map(d=>({lord:d.lordZh,from:VEDIC.jd2date(d.fromJD),to:VEDIC.jd2date(d.toJD)}))};
      }catch(e){R.yinzhan={error:e.message};}

      /* 灵数 */
      try{R.lingming={life:lingNum(su.year,su.month,su.day),born:dRoot(su.day),chain:[layerNum(su.year),layerNum(su.month),layerNum(su.day)]};}
      catch(e){R.lingming={error:e.message};}

      /* 称骨 */
      try{
        const yGZ=lunar.getYearInGanZhi();const mo=Math.abs(lunar.getMonth()),da=lunar.getDay();
        const hi=hourIdx(zhiOfHour(su.hour));
        const w=(CG_YEAR[yGZ]||0)+(CG_MONTH[mo]||0)+(CG_DAY[da]||0)+(CG_HOUR[hi]||0);
        const k=Math.round(w*10);
        R.chengu={weight:+w.toFixed(1),song:CG_FATE[k/10]||''};
      }catch(e){R.chengu={error:e.message};}
      return R;
    }

    const go=()=>{
      out.querySelectorAll('.res').forEach(n=>n.remove());
      let su=st;
      try{
        if(st.tst){
          const ts=ASTRO.trueSolarTime(st.year,st.month,st.day,st.hour,st.minute,st.lon);
          const dt=new Date(st.year,st.month-1,st.day+ts.dayShift,ts.hour,ts.minute);
          su={year:dt.getFullYear(),month:dt.getMonth()+1,day:dt.getDate(),hour:ts.hour,minute:ts.minute,gender:st.gender,lon:st.lon,lat:st.lat,tz:st.tz,lateZi:st.lateZi};
        }
        const R=build(su);
        const b=R.bazi,z=R.ziwei,x=R.xzhan,y=R.yinzhan,lm=R.lingming,cg=R.chengu;
        const ov=[];
        ov.push(['八字',b.error?('失败:'+b.error):b.pillars.join(' ')]);
        ov.push(['五行·生肖',b.error?'—':(b.wux+' · '+b.shengXiao)]);
        ov.push(['现行大运',b.error?'—':(b.currentYun||'—')]);
        ov.push(['紫微命宫',z.error?('失败:'+z.error):(z.soulPalace+'宫 · '+z.ju+' · '+z.mut4.join(' '))]);
        ov.push(['日/月/升',x.error?('失败:'+x.error):(x.sun+' / '+x.moon+' / '+x.asc)]);
        ov.push(['月亮宿·大运',y.error?('失败:'+y.error):(y.moonNak+' pada'+y.pada+' · '+(y.curDasha?y.curDasha.lord+'大运剩'+y.curDasha.remain+'年':'—'))]);
        ov.push(['灵数',lm.error?'—':('主'+lm.life+' 生日'+lm.born+' 链'+lm.chain.join('-'))]);
        ov.push(['称骨',cg.error?'—':(cg.weight+'两')]);
        const cardOv=resultCard('九维排盘总览',kvTable(ov),
          plainNote('六套系统已按同一出生时间排齐；下方 AI 会按九维框架把它们串起来——共振点即确定信号，矛盾点多为流派或坐标系差异。'));
        cardOv.classList.add('res');

        const det=h('details',{class:'res'},h('summary',{class:'gold',style:'cursor:pointer;padding:10px 0'},'▸ 展开各系统完整排盘明细'));
        const box=h('div',{style:'margin-top:6px'});
        [['八字 bazi',b],['紫微 ziwei',z],['西洋占星 xzhan',x],['印度占星 yinzhan',y],['灵数 lingming',lm],['称骨 chengu',cg]].forEach(([t,d])=>{
          const d2=h('details',h('summary',{style:'cursor:pointer;color:var(--gold-hi);padding:4px 0'},t));
          d2.append(h('pre',{style:'white-space:pre-wrap;font-size:12px;line-height:1.6'},JSON.stringify(d,null,1)));
          box.append(d2);
        });
        det.append(box);

        const cardAI=resultCard('⚡ AI 九维交叉解读',
          h('div',{class:'ai-slot','data-ctx':'ninedim','data-payload':JSON.stringify(R)}));
        cardAI.classList.add('res');
        out.append(cardOv,det,cardAI);
      }catch(e){out.append(h('div',{class:'err res'},'九维排盘失败：'+esc(e.message)));}
    };

    el.append(h('div',{class:'toolhead'},h('h2',{},'九 九维解读'),h('p',{class:'tdesc'},'一次排齐八字·紫微·西占·印占·灵数·称骨，AI 按九维框架交叉验证。')),
      h('div',{class:'toolbar'},
        field('公历',dateInput(st,true)),field('时间',timeInput(st,true)),field('性别',selectEl([['男','男'],['女','女']],st.gender,v=>st.gender=v)),
        field('地点',cityInput(st)),
        field('晚子时',selectEl([['day','主流不换日'],['swap','夜子时换日']],st.lateZi,v=>st.lateZi=v)),
        (function(){const c=h('input',{type:'checkbox',onchange:e=>st.tst=e.target.checked});return field('真太阳时',h('label',{style:'cursor:pointer;font-size:12.5px'},c,'启用'));})(),
        btn('九维排盘',go)),out);
    go();
  }
});
})();
