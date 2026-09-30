const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createGame, ROOT, html, scripts} = require('./helpers/game-harness.cjs');
const plain = value => JSON.parse(JSON.stringify(value));

test('HTML loads configuration before all consumers and defaults to espresso', () => {
  const game=createGame();
  assert.equal(game.context.GameFuel.type,'espresso');
  assert(scripts.indexOf('src/config.js')<scripts.indexOf('src/fuel.js'));
  assert(scripts.indexOf('src/fuel.js')<scripts.indexOf('src/i18n.js'));
  assert.equal(new Set(scripts).size,scripts.length);
  assert.equal(game.byId.get('start-menu-modal').style.display,'flex');
});

test('unsupported or inherited fuel names fail explicitly', () => {
  for(const fuelType of ['cofee','toString','__proto__'])assert.throws(()=>createGame({fuelType}),/Unknown fuelType/);
});

for(const fuelType of ['espresso','redbull'])for(const language of ['lt','en']) {
  const name=fuelType==='redbull'?'Red Bull':language==='lt'?'Espreso':'Espresso';
  const unit=language==='lt'?(fuelType==='redbull'?'skard.':'puod.'):(fuelType==='redbull'?'can':'cup');
  const units=language==='en'?unit+'s':unit;
  const label=`${fuelType}/${language}`;

  test(`${label}: selected drink reaches labels, menus and runtime messages`, () => {
    const game=createGame({fuelType,language}), i18n=game.context.i18n;
    assert.equal(i18n.t('hud_fuel'),name+':');
    assert.equal(i18n.t('lb_fuel_units',{count:1}),`1 ${unit}`);
    assert.equal(i18n.t('lb_fuel_units',{count:2}),`2 ${units}`);
    assert.equal(i18n.t('lb_fuel_units',{count:0}),`0 ${units}`);
    assert(game.elements.find(el=>el.attrs['data-i18n']==='hud_fuel').innerHTML.includes(name));
    const params={count:2,remaining:1,scavenged:2,mistakes:1,penalty:60,name:'LEVEL',staged:3,total:5};
    const keys=['hud_fuel_title','controls_hint','rule_fuel','rule_penalties','diag_hotfix','diag_critical_oom','status_failed_oom',
      'diag_stats','status_deployed_success','lb_th_fuel','game_over_desc','victory_fuel_preserved','victory_fuel_summary',
      'victory_penalty_summary','toast_entered_level','toast_scavenged_fuel'];
    for(const key of keys) {
      const text=i18n.t(key,params);
      assert.notEqual(text,key);assert.doesNotMatch(text,/\{\w+\}/,key);
      assert.doesNotMatch(text,fuelType==='redbull'?/espresso|espreso|coffee|cups|puod/i:/red\s*bull|cans|skard/i,key);
    }
    for(const el of game.elements)if(el.attrs['data-i18n'])assert.doesNotMatch(el.innerHTML,/\{fuel\w+\}/);
    i18n.toggleLanguage();
    const switched=fuelType==='redbull'?'Red Bull':language==='lt'?'Espresso':'Espreso';
    assert.equal(game.elements.find(el=>el.attrs['data-i18n']==='hud_fuel').innerHTML,switched+':');
  });

  test(`${label}: two pickups and five questions; each pickup adds fuel only once`, () => {
    const game=createGame({fuelType,language});game.run('startGame()');
    const cells=game.state.board.flat();
    assert.equal(cells.length,25);assert.equal(cells.filter(c=>c.type==='fuel').length,2);
    assert.equal(cells.filter(c=>c.type==='enemy').length,5);assert.equal(game.state.board[0][0].type,'start');
    const pickup=game.board.interactiveObjects.find(obj=>obj.userData.isFuel);
    game.visit(pickup.userData.gridX,pickup.userData.gridY);
    game.visit(pickup.userData.gridX,pickup.userData.gridY);
    assert.equal(game.state.fuel,1);assert.equal(game.state.stats.totalScavenged,1);
    assert.equal(game.byId.get('fuel-count').innerText,'1');
    assert.equal(game.board.interactiveObjects.filter(obj=>obj.userData.isFuel).length,1);
    assert.equal(game.sounds.filter(s=>s==='collectFuel').length,1);
    game.collect();assert.equal(game.state.fuel,2);
  });

  test(`${label}: stages answers, preserves penalties and carries fuel through all levels`, async () => {
    const game=createGame({fuelType,language});game.run('startGame()');
    const expectedFuel=[1,3,4];
    for(let level=0;level<3;level++) {
      game.collect();const fuelBefore=game.state.fuel;game.stage(level===1?0:1);
      assert.equal(game.state.fuel,fuelBefore,'Validation must remain deferred');
      assert.equal(Object.keys(game.state.stagedTasks).length,5);
      assert.equal(game.byId.get('btn-run-pipeline').disabled,false);
      await game.run('executePipelineRun()');
      assert.equal(game.state.fuel,expectedFuel[level]);
      assert.equal(game.state.timer.elapsedMs,3250*(level+1)+60000*(level===2?2:1));
      assert.equal(game.byId.get('diagnostic-footer').style.display,'flex');
      await game.byId.get('btn-diagnostic-action').click();
      if(level<2){assert.equal(game.state.levelIndex,level+1);assert.equal(Object.keys(game.state.stagedTasks).length,0);}
    }
    assert.equal(game.state.gameOver,true);assert.equal(game.state.timer.running,false);
    assert.equal(game.state.stats.totalScavenged,6);assert.equal(game.state.stats.totalMistakes,2);
    assert.equal(game.byId.get('victory-score-entry').style.display,'block');
    assert.equal(game.byId.get('victory-fuel-val').innerText,'4');
    assert.equal(game.delays.reduce((a,b)=>a+b,0),15900,'Diagnostic pacing remains unchanged');
    let submitted;
    game.context.fetch=async(url,options)=>{
      if(options?.method==='POST')submitted=JSON.parse(options.body);
      return {ok:true,json:async()=>null};
    };
    game.byId.get('player-name-input').value='FUEL_TEST';
    await game.byId.get('btn-save-score').click();
    assert.equal(submitted.espresso,4);assert.equal(submitted.redBulls,4);
    assert.equal(submitted.timeMs,game.state.timer.elapsedMs);
    await game.byId.get('btn-restart').click();
    assert.equal(game.state.fuel,0);assert.equal(game.state.levelIndex,0);assert.equal(game.state.stats.totalMistakes,0);
  });

  test(`${label}: zero fuel survives, overspending fails after validation`, async () => {
    for(const mistakes of [0,2,3]) {
      const game=createGame({fuelType,language});game.run('startGame()');
      await game.run('executePipelineRun()');assert.equal(game.state.pipelineRunning,false);
      if(mistakes>0)game.collect();game.stage(mistakes);
      const first=game.run('executePipelineRun()');
      await game.run('executePipelineRun()'); // Duplicate submission must be ignored.
      await first;
      assert.equal(game.state.fuel,mistakes===3?-1:0);
      assert.equal(game.state.stats.totalMistakes,mistakes);
      assert.equal(game.state.timer.elapsedMs,3250+60000*mistakes);
      await game.byId.get('btn-diagnostic-action').click();
      assert.equal(game.state.gameOver,mistakes===3);
      if(mistakes===3){assert.equal(game.state.timer.running,false);assert.equal(game.byId.get('victory-score-entry').style.display,'none');}
      else assert.equal(game.state.levelIndex,1);
    }
  });

  test(`${label}: old scores keep their ordering, units and original write schema`, async () => {
    const game=createGame({fuelType,language}), c=game.context;
    const lb=c.createLeaderboard(c.Utils.formatStopwatch);
    const data={
      legacy:{name:'LEGACY',timeMs:1000,timeFormatted:'00:01.00',redBulls:3},
      current:{name:'CURRENT',timeMs:1000,timeFormatted:'00:01.00',espresso:2,redBulls:2},
      zero:{name:'ZERO',timeMs:1000,timeFormatted:'00:01.00',espresso:0,redBulls:99},
      neutral:{name:'NEUTRAL',timeMs:1000,timeFormatted:'00:01.00',fuel:4},
      missing:{name:'MISSING',timeMs:2000,timeFormatted:'00:02.00'}
    };
    c.fetch=async()=>({ok:true,json:async()=>data});
    assert.deepEqual(plain((await lb.getLeaderboard()).map(r=>r.name)),['NEUTRAL','LEGACY','CURRENT','ZERO','MISSING']);
    await lb.renderLeaderboard();
    const rows=game.byId.get('leaderboard-body').children;
    assert(rows[0].innerHTML.includes(`4 ${units}`));assert(rows[3].innerHTML.includes(`0 ${units}`));
    let request;
    c.fetch=async(url,options)=>{request={url,options};return {ok:true};};
    await lb.saveLeaderboardRecord(' test ',12345,0);
    const record=JSON.parse(request.options.body);
    assert.deepEqual(Object.keys(record).sort(),['date','espresso','name','redBulls','timeFormatted','timeMs','timestamp'].sort());
    assert.equal(record.espresso,0);assert.equal(record.redBulls,0);assert.equal(record.timeFormatted,'00:12.34');
    assert.equal(record.name,'TEST');assert.equal(request.options.method,'POST');
    assert.equal(JSON.parse(game.storage.get('pyspark_survivor_leaderboard')).find(r=>r.name==='TEST').espresso,0);
    c.fetch=async()=>{throw Error('offline');};
    assert((await lb.getLeaderboard()).some(r=>r.name==='TEST'));
  });
}

test('one-line choice selects the cup or restored labelled can without changing layout', () => {
  const espresso=createGame({fuelType:'espresso',seed:123}), redbull=createGame({fuelType:'redbull',seed:123});
  const layout=game=>game.state.board.map(col=>col.map(cell=>[cell.type,cell.data?.id]));
  assert.deepEqual(plain(layout(espresso)),plain(layout(redbull)));
  const cup=espresso.board.interactiveObjects.find(o=>o.userData.isFuel).userData.mesh;
  const can=redbull.board.interactiveObjects.find(o=>o.userData.isFuel).userData.mesh;
  for(const part of ['cup','saucer','coffee','crema','handle'])assert(cup.children.some(child=>child.name===`espresso-${part}`));
  assert.equal(can.geometry.type,'CylinderGeometry');
  assert.equal(can.children.length,3);assert.equal(can.material.length,3);
  assert.equal(espresso.canvasText.length,0);assert(redbull.canvasText.includes('Red Bull'));
  for(const game of [espresso,redbull])game.board.updateInteractiveObjects(1,{x:0,z:0});
});

// Raycasting needs the real r128 build; the default harness only tests gameplay.
const realGeometry = {skip: !process.env.THREE_TEST_MODULE};

test('espresso coffee stays visible from gameplay camera angles throughout rotation', realGeometry, () => {
  const game=createGame(), THREE=game.context.THREE, cup=game.context.GameFuel.createMesh();
  const coffee=cup.getObjectByName('espresso-coffee');
  // Avoid the exact shared center vertex of the circle's triangle fan.
  const target=new THREE.Vector3(0.01,coffee.position.y,0.013);
  // Near/far corners of the 5x5 board relative to the following camera,
  // plus its centered desktop and portrait views. Pickups float at y ~= 0.85.
  const views=[[0,18.15,13.5],[0,21.15,15.5],[0,37.15,27]];
  for(const x of [-9.6,9.6])for(const z of [3.9,23.1])views.push([x,18.15,z]);
  for(let step=0;step<16;step++) {
    cup.rotation.y=step*Math.PI/8;
    cup.updateMatrixWorld(true);
    for(const coordinates of views) {
      const origin=new THREE.Vector3(...coordinates);
      const ray=new THREE.Raycaster(origin,target.clone().sub(origin).normalize());
      assert.equal(ray.intersectObject(cup,true)[0]?.object.name,'espresso-coffee',
        `Coffee occluded at rotation ${step}, camera ${coordinates}`);
    }
  }
});

test('espresso handle has an open hole and projects beyond the cup wall', realGeometry, () => {
  const game=createGame(), THREE=game.context.THREE, cup=game.context.GameFuel.createMesh();
  cup.updateMatrixWorld(true);
  const through=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1))
    .intersectObject(cup,true);
  assert.equal(through(0.36,-0.005).length,0,'The handle hole must remain open');
  assert.equal(through(0.49,-0.005)[0]?.object.name,'espresso-handle');
});

test('espresso cup and saucer silhouettes use dark unlit outlines', realGeometry, () => {
  const game=createGame(), THREE=game.context.THREE, cup=game.context.GameFuel.createMesh();
  cup.updateMatrixWorld(true);
  for(const [name,x,y] of [['cup',-0.29,0.19],['saucer',-0.455,-0.21]]) {
    const ray=new THREE.Raycaster(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1));
    const hit=ray.intersectObject(cup,true)[0];
    assert.equal(hit?.object.name,`espresso-${name}-outline`);
    assert.equal(hit.object.material.isMeshBasicMaterial,true);
    assert.equal(hit.object.material.color.getHex(),0x101317);
  }
});

test('shared gameplay, DOM and translations contain no drink-specific names', () => {
  const shared=['src/main.js','src/board.js','src/engine.js','src/audio.js','src/pipeline.js','src/ui.js','src/i18n.js',
    'src/content/bronze.js','src/content/silver.js','src/content/gold.js'];
  for(const file of shared)assert.doesNotMatch(fs.readFileSync(path.join(ROOT,file),'utf8'),/espresso|red.?bull|coffee|espreso|puod/i,file);
  assert.doesNotMatch(html,/espresso|red.?bull|coffee|espreso|puod/i);
});
