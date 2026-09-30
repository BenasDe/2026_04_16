// Dependency-free logic harness; this deliberately does not emulate WebGL/CSS.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(src\/[^"]+)"/g)].map(m => m[1]);

function makeThreeDouble() {
  class Vector {
    constructor(x=0,y=0,z=0) { this.set(x,y,z); }
    set(x,y,z) { Object.assign(this,{x,y,z}); return this; }
  }
  class Group {
    constructor() { this.children=[]; this.userData={}; this.position=new Vector(); this.rotation=new Vector(); this.scale=new Vector(1,1,1); }
    add(...children) { this.children.push(...children); }
    remove(child) { this.children=this.children.filter(c=>c!==child); }
    traverse(fn) { fn(this); this.children.forEach(c=>c.traverse(fn)); }
  }
  class Mesh extends Group {
    constructor(geometry,material) { super(); Object.assign(this,{geometry,material,isMesh:true}); }
  }
  class LineSegments extends Mesh { constructor(...args) { super(...args); this.isMesh=false; this.isLineSegments=true; } }
  class Material {
    constructor(options={}) {
      Object.assign(this,options);
      for(const field of ['color','emissive']) if(field in options) this[field]={setHex(value){this.value=value;},value:options[field]};
    }
    dispose() {}
  }
  const result={Group,Scene:Group,Mesh,LineSegments,Vector2:Vector,MeshStandardMaterial:Material,MeshBasicMaterial:Material,LineBasicMaterial:Material,
    CanvasTexture:class {constructor(image){this.image=image;}},sRGBEncoding:3001,BackSide:1,DoubleSide:2,MathUtils:{clamp:(n,min,max)=>Math.max(min,Math.min(max,n))}};
  for(const type of ['BoxGeometry','CylinderGeometry','EdgesGeometry','RingGeometry','CircleGeometry','TorusGeometry','LatheGeometry']) {
    result[type]=class {constructor(...args){this.type=type;this.args=args;}dispose(){}};
  }
  return result;
}

function createGame({fuelType, language='lt', seed=1, prepareContent}={}) {
  const elements=[], byId=new Map(), events={}, timeouts=new Map(), intervals=new Map();
  const storage=new Map([['pyspark_survivor_lang',language]]), sounds=[], canvasText=[], delays=[];
  let now=1000000, timerId=1;
  class Element {
    constructor(tag, attrs={}) { this.tagName=tag.toUpperCase();this.attrs=attrs;this.id=attrs.id;this.style={};this.children=[];this.listeners={};this.disabled='disabled' in attrs;this.className=attrs.class||'';this.value=attrs.value||'';this.classList={add(){},remove(){}}; }
    set innerHTML(value) { this.html=String(value);this.children=[]; }
    get innerHTML() { return this.html||''; }
    set innerText(value) { this.text=String(value); }
    get innerText() { return this.text||''; }
    set textContent(value) { this.innerText=value; }
    get textContent() { return this.innerText; }
    appendChild(el) { this.children.push(el);return el; }
    getAttribute(name) { return this.attrs[name]??null; }
    setAttribute(name,value) { this.attrs[name]=value; }
    addEventListener(name,fn) { (this.listeners[name]||=[]).push(fn); }
    querySelectorAll(selector) { return this.children.filter(el=>'.'+el.className===selector); }
    focus() { context.document.activeElement=this; }
    select() {}
    async click() { if(this.disabled)return; for(const fn of this.listeners.click||[])await fn(); if(this.onclick)await this.onclick(); }
    getContext() { return {fillRect(){},strokeText(text){canvasText.push(text);},fillText(text){canvasText.push(text);}}; }
  }
  for(const match of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const attrs={};
    for(const a of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]??'';
    const el=new Element(match[1],attrs);elements.push(el);if(el.id)byId.set(el.id,el);
  }
  const query=selector=>elements.filter(el=>selector.startsWith('[') && selector.slice(1,-1) in el.attrs);
  const THREE=process.env.THREE_TEST_MODULE?require(process.env.THREE_TEST_MODULE):makeThreeDouble();
  class ClockDate extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
  const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const context={
    THREE, Math:math, Date:ClockDate, console:{log(){},warn(){},error(){}},
    document:{activeElement:null,hidden:false,documentElement:{lang:'lt'},title:'',getElementById:id=>byId.get(id)||null,querySelectorAll:query,
      createElement:tag=>new Element(tag),addEventListener:(name,fn)=>(events[name]||=[]).push(fn)},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
    setTimeout:(fn,ms)=>{const id=timerId++;timeouts.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timeouts.delete(id),
    setInterval:fn=>{const id=timerId++;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),
    addEventListener:(name,fn)=>(events[name]||=[]).push(fn),confirm:()=>false,
    fetch:async()=>{throw Error('Network is disabled in tests');}
  };
  context.window=context;vm.createContext(context);
  const run=code=>vm.runInContext(code,context);
  for(const file of scripts) {
    let source=fs.readFileSync(path.join(ROOT,file),'utf8');
    if(file==='src/data.js' && prepareContent) {
      // Prepare fixtures before the real startup validator sees the pack.
      const validate=context.GameContent.validate;
      context.GameContent={...context.GameContent,validate:pack=>{prepareContent(pack);return validate(pack);}};
    }
    if(file==='src/config.js' && fuelType!==undefined)source=source.replace(/fuelType:\s*'[^']*'/,`fuelType: ${JSON.stringify(fuelType)}`);
    if(file==='src/main.js') {
      // Real board, controls, UI, staging, timer and pipeline; only drawing/audio are stubbed.
      context.GameEngine=class {
        constructor(){this.board=new context.GameBoard(new THREE.Scene(),2.4);}
        buildBoard(...args){return this.board.buildBoard(...args);}
        setPlayerGridPosition(){} startRenderLoop(){}
        animatePlayerMovement(x,y,size,done){done();}
        removeInteractiveObject(...args){this.board.removeInteractiveObject(...args);}
        markTaskAsStaged(...args){this.board.markTaskAsStaged(...args);}
      };
      run('GameEngine = window.GameEngine');
      context.sfx=new Proxy({}, {get:(_,key)=>()=>sounds.push(key)});
      context.music={enabled:true,start(){},toggle(){},onChange(){}};
      context.Utils.delay=async ms=>{delays.push(ms);};
    }
    vm.runInContext(source,context,{filename:file});
  }
  const state=run('gameState');
  const advance=ms=>{
    now+=ms;
    for(const [id,t] of [...timeouts])if(t.at<=now){timeouts.delete(id);t.fn();}
    for(const fn of intervals.values())fn();
  };
  const visit=(x,y)=>{state.player.gridX=x;state.player.gridY=y;run('checkCurrentTile()');};
  const collect=()=>{
    state.board.forEach((column,x)=>column.forEach((cell,y)=>{if(cell.type==='fuel'&&!cell.cleared)visit(x,y);}));
  };
  const stage=mistakes=>{
    let index=0;
    state.board.forEach((column,x)=>column.forEach((cell,y)=>{
      if(cell.type!=='enemy')return;
      visit(x,y);
      const correct=index++>=mistakes;
      const desired=cell.data.skills.find(skill=>skill.correct===correct);
      const card=byId.get('skills-grid').children.find(el=>el.getAttribute('data-skill-id')===desired.id);
      if(!card)throw Error('Answer card missing');
      card.onclick();advance(650);
    }));
  };
  return {context,state,run,byId,elements,storage,sounds,canvasText,delays,advance,visit,collect,stage,board:run('engine.board')};
}

module.exports={createGame,ROOT,html,scripts};
