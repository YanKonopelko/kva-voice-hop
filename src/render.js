import { PHYSICS } from './sim.js?v=c204956e4ef6';
import { drawHat } from './cosmetics.js?v=c204956e4ef6';

const TAU = Math.PI * 2;
function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ellipse(ctx,x,y,rx,ry,fill) { ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,TAU); ctx.fillStyle=fill; ctx.fill(); }
function round(ctx,x,y,w,h,r,fill) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill;ctx.fill(); }
function line(ctx,points,color,width=2) {ctx.beginPath();ctx.moveTo(...points[0]);for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width=1000; this.height=540; this.dpr=1; this.cache=new Map(); this.time=0;
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
    this.resize();
  }
  resize() {
    const rect=this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // ResizeObserver runs after layout, potentially after this frame's draw.
    // Never clear the presented bitmap here: keep it until the next full render.
    this.pendingViewport={width:rect.width,height:rect.height};
  }
  applyResize() {
    if (!this.pendingViewport) return;
    const rect=this.pendingViewport;
    this.pendingViewport=null;
    const aspect=rect.width/rect.height;
    this.width=Math.max(580,aspect*540); this.height=this.width/aspect;
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    const pixelWidth=Math.max(1,Math.round(rect.width*this.dpr));
    const pixelHeight=Math.max(1,Math.round(rect.height*this.dpr));
    // Assigning even the same width/height clears a canvas and resets its context.
    if(this.canvas.width!==pixelWidth)this.canvas.width=pixelWidth;
    if(this.canvas.height!==pixelHeight)this.canvas.height=pixelHeight;
    this.scale=this.canvas.width/this.width;
  }
  platformTexture(level,platform,index) {
    const [x,y,w]=platform, key=`${level.id}-${index}`;
    if(this.cache.has(key))return this.cache.get(key);
    const canvas=document.createElement('canvas');canvas.width=w+16;canvas.height=220;
    const c=canvas.getContext('2d'),rng=seeded(level.seed+index*81);
    c.translate(8,0);
    // Cached terrain: distinct turf, warm strata, roots and little pebbles.
    c.beginPath();c.moveTo(0,11);c.quadraticCurveTo(-3,0,14,0);c.lineTo(w-14,0);c.quadraticCurveTo(w+3,0,w,13);c.lineTo(w-9,178);c.quadraticCurveTo(w-20,211,w*.77,211);c.lineTo(w*.21,211);c.quadraticCurveTo(12,205,9,176);c.closePath();
    const earth=c.createLinearGradient(0,0,0,220);earth.addColorStop(0,'#d2be82');earth.addColorStop(.45,'#cbb780');earth.addColorStop(1,'#bca678');c.fillStyle=earth;c.fill();
    c.save();c.clip();
    for(let k=0;k<3;k++){c.beginPath();c.moveTo(-10,53+k*57);for(let xx=0;xx<w+20;xx+=20)c.lineTo(xx,51+k*57+Math.sin(xx*.017+k)*8);c.strokeStyle=['#bda77144','#e9d59b66','#a9946340'][k];c.lineWidth=7;c.stroke();}
    for(let i=0;i<w*.38;i++){const px=rng()*w,py=24+rng()*188;ellipse(c,px,py,1+rng()*3,1+rng()*1.8,rng()>.5?'#a8936455':'#f0db9c88');}
    c.restore();
    // Scalloped, overhanging edge reads as a continuous meadow.
    c.beginPath();c.moveTo(0,7);c.quadraticCurveTo(-5,-1,9,-2);c.lineTo(w-9,-2);c.quadraticCurveTo(w+4,-1,w,10);
    for(let xx=w;xx>0;xx-=13){c.quadraticCurveTo(xx-2,24+(xx%5),xx-8,14);c.quadraticCurveTo(xx-12,21,xx-15,13);}c.closePath();c.fillStyle='#64965b';c.fill();
    round(c,2,0,w-4,7,4,'#89b36c');
    for(let i=0;i<w/18;i++){let px=5+rng()*(w-10);line(c,[[px,3],[px+1,-3],[px+4,2]],'#9cc57c',1.5);}
    this.cache.set(key,canvas);return canvas;
  }
  cloud(x,y,s,t) {
    const c=this.ctx;c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#f8f9e9';c.globalAlpha=.78;
    c.beginPath();c.moveTo(-60,10);c.bezierCurveTo(-85,8,-73,-14,-52,-15);c.bezierCurveTo(-56,-45,-13,-54,-2,-27);c.bezierCurveTo(8,-49,46,-43,44,-14);c.bezierCurveTo(79,-15,81,12,52,13);c.closePath();c.fill();
    c.globalAlpha=.3;ellipse(c,6,16,69,5,'#f4f6e4');c.restore();
  }
  background(level,time,camera) {
    const c=this.ctx,W=this.width,H=this.height,off=H-540;
    let gradient=c.createLinearGradient(0,0,0,H);gradient.addColorStop(0,level.sky[0]);gradient.addColorStop(1,level.sky[1]);c.fillStyle=gradient;c.fillRect(0,0,W,H);
    const sunX=W*.82-camera*.015;
    ellipse(c,sunX,off*.25+109,48,48,'#f3edba');ellipse(c,sunX,off*.25+109,61,61,'#f1edc122');
    for(let i=0;i<6;i++) {let x=((i*286+60-camera*.075+time*(i%2?.6:1.2))%(W+370)+(W+370))%(W+370)-130;this.cloud(x,65+(i%3)*53+off*.25,.38+(i%3)*.14,time);}
    // Layered rolling silhouettes and a few small trees create parallax depth.
    for(let layer=0;layer<3;layer++){
      const base=off+355+layer*34,amp=layer===0?91:60,parallax=[.1,.19,.3][layer];
      c.beginPath();c.moveTo(0,H);c.lineTo(0,base);
      for(let x=-20;x<=W+20;x+=10){const xx=x+camera*parallax;c.lineTo(x,base-Math.sin(xx*.0047+layer*2.9)*amp-Math.sin(xx*.012+layer)*amp*.14);}
      c.lineTo(W,H);c.closePath();c.fillStyle=['#aacdb1','#92bba0','#7ca789'][layer];c.fill();
      if(layer===1){for(let i=0;i<7;i++){const xx=i*245+110-camera*parallax;const x=((xx%(W+300))+(W+300))%(W+300)-80;const y=base-Math.sin((x+camera*parallax)*.0047+layer*2.9)*amp-17;line(c,[[x,y+20],[x,y-13]],'#7ca58d',4);ellipse(c,x,y-17,17,24,'#94bca0');ellipse(c,x+11,y-14,12,18,'#94bca0');}}
    }
    // Pond sits behind the islands, with slowly drifting reflections.
    const waterY=off+486;
    c.fillStyle=level.water;c.fillRect(0,waterY,W,H-waterY);
    for(let k=0;k<5;k++){
      c.beginPath();c.moveTo(0,waterY+k*15);
      for(let x=0;x<=W+10;x+=12)c.lineTo(x,waterY+k*15+Math.sin(x*.018+time*.9+k*1.7)*2);
      c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fillStyle=k%2?'#d4e8c91a':'#6aa99d18';c.fill();
    }
    for(let i=0;i<13;i++){const x=((i*137-camera*.32+time*3)%(W+80)+W+80)%(W+80)-40;round(c,x,waterY+11+(i*29)%56,20+(i%4)*12,1.5,1,'#e2f0d24d');}
    for(let i=0;i<4;i++){const x=((i*363+240-camera*.4)%(W+320)+W+320)%(W+320)-160;this.lily(x,waterY+20+(i%2)*24,.6+(i%3)*.13,time+i);}
  }
  lily(x,y,s,time) {
    const c=this.ctx;c.save();c.translate(x,y+Math.sin(time*.8)*1.3);c.scale(s,s);
    ellipse(c,0,5,31,6,'#528c7730');c.fillStyle='#699c73';c.beginPath();c.ellipse(0,0,27,8,0,.12,TAU-.18);c.lineTo(5,0);c.closePath();c.fill();line(c,[[-19,0],[-4,0]],'#a0bd7e',1);
    ellipse(c,8,-4,4,4,'#f1e9b7');ellipse(c,5,-4,3,4,'#f8f2cd');c.restore();
  }
  foliage(x,y,size,phase,time) {
    const c=this.ctx,sway=Math.sin(time*1.2+phase)*.08;
    c.save();c.translate(x,y);c.scale(size,size);c.rotate(sway);
    for(let i=0;i<3;i++){
      c.save();c.rotate((i-1)*.58);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-18,-15,-24,-43,0,-53);c.bezierCurveTo(16,-35,12,-11,0,0);c.fillStyle=['#56845b','#5c8c5c','#729c61'][i];c.fill();line(c,[[0,0],[0,-36]],'#8eb773',1.2);c.restore();
    }c.restore();
  }
  flower(x,y,color,phase,time) {
    const c=this.ctx,sway=Math.sin(time*1.5+phase)*2;
    c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+sway-3,y-9,x+sway,y-17);c.strokeStyle='#6b965b';c.lineWidth=1.5;c.stroke();
    for(let i=0;i<5;i++){const a=i/5*TAU;ellipse(c,x+sway+Math.cos(a)*3,y-17+Math.sin(a)*3,2.6,2.6,color);}
    ellipse(c,x+sway,y-17,1.8,1.8,'#e0b65a');
  }
  sign(x,y,text) {
    const c=this.ctx;line(c,[[x,y],[x,y-48]],'#a99364',5);round(c,x-40,y-62,94,23,5,'#e9d8a8');
    c.fillStyle='#87784f';c.font='bold 9px "Trebuchet MS", sans-serif';c.textAlign='center';c.fillText(text,x+7,y-47);ellipse(c,x-32,y-51,1.5,1.5,'#ad9460');
  }
  flag(x,y,active,time) {
    const c=this.ctx;ellipse(c,x,y+3,15,4,'#44654528');line(c,[[x,y],[x,y-95]],'#7c8e60',4);
    const flutter=Math.sin(time*3)*3;
    c.beginPath();c.moveTo(x+2,y-93);c.bezierCurveTo(x+16,y-95+flutter,x+27,y-84+flutter,x+40,y-89);c.lineTo(x+40,y-63);c.bezierCurveTo(x+26,y-59+flutter,x+15,y-70+flutter,x+2,y-65);c.closePath();c.fillStyle=active?'#d8ed84':'#eaf0d6';c.fill();
    c.fillStyle=active?'#6e8c4b':'#a1b492';c.font='bold 15px sans-serif';c.fillText('✓',x+20,y-72);ellipse(c,x,y-98,4,4,'#b2c27a');
  }
  home(x,y,time) {
    const c=this.ctx;ellipse(c,x+20,y+3,72,8,'#486e4530');
    round(c,x-33,y-95,108,96,19,'#edddb1');round(c,x-19,y-88,80,8,4,'#e3ce9a');
    c.beginPath();c.moveTo(x-48,y-83);c.bezierCurveTo(x-59,y-101,x-2,y-152,x+23,y-145);c.bezierCurveTo(x+45,y-151,x+100,y-99,x+88,y-83);c.quadraticCurveTo(x+23,y-70,x-48,y-83);c.fillStyle='#91ad6c';c.fill();
    for(let i=0;i<6;i++)ellipse(c,x-25+i*18,y-99-Math.sin(i/5*Math.PI)*24,5,3,'#b8cb84');
    round(c,x+7,y-56,32,57,[16,16,0,0],'#9d9669');round(c,x+12,y-51,22,52,[11,11,0,0],'#b6ae7f');ellipse(c,x+30,y-25,2,2,'#eaddab');
    round(c,x-19,y-60,18,22,5,'#a0bcab');line(c,[[x-10,y-59],[x-10,y-39]],'#e7dbb1',2);line(c,[[x-18,y-49],[x-2,y-49]],'#e7dbb1',2);
    this.flower(x+64,y,'#f2edc5',0,time);this.flower(x-27,y,'#d8b396',3,time);this.foliage(x+83,y,.42,3,time);
    c.fillStyle='#7d8e64';c.font='9px "Trebuchet MS", sans-serif';c.textAlign='center';c.fillText('ДОМ, МИЛЫЙ ДОМ',x+22,y-165);
  }
  hazard(x,y,width,time) {
    const c=this.ctx;ellipse(c,x+width*.5,y+3,width*.7,4,'#54784828');
    for(let i=0;i<3;i++){
      const bx=x+i*width/3;
      c.beginPath();c.moveTo(bx-2,y+1);c.quadraticCurveTo(bx+2,y-9,bx+width/6,y-22-i%2*5);c.quadraticCurveTo(bx+width/3-1,y-8,bx+width/3+2,y+1);c.fillStyle='#ba947d';c.fill();
      line(c,[[bx+width/6,y-15],[bx+width/6-1,y-4]],'#e1c0a3',1.4);
    }
  }
  coin(x,y,time,index=0) {
    const c=this.ctx,phase=time*2.25+index*.8,bob=Math.sin(time*2.6+index*.8)*3;
    c.save();c.translate(x,y+bob);
    c.scale(.24+.76*Math.abs(Math.cos(phase)),1);
    // A solid rim and stamped lily leaf; no shadow floating under the pickup.
    ellipse(c,2,1,12,13,'#b88c3d');
    ellipse(c,0,0,12,13,'#e4b653');
    ellipse(c,-.5,-.5,9.4,10.5,'#f6d576');
    c.beginPath();c.ellipse(0,0,9.8,10.8,0,Math.PI*1.05,Math.PI*1.65);c.strokeStyle='#fff1b2';c.lineWidth=1.7;c.stroke();
    c.beginPath();c.moveTo(-5,2);c.bezierCurveTo(-8,-4,-1,-8,4,-4);c.bezierCurveTo(9,0,4,7,-1,6);c.lineTo(1,1);c.closePath();c.fillStyle='#c99b40';c.fill();
    line(c,[[-2,3],[1,-2]],'#e7ba54',1.2);
    c.restore();
    const glint=Math.max(0,Math.sin(time*2+index*1.7)-.92)*12.5;
    if(glint>0){c.save();c.translate(x+8,y+bob-9);c.globalAlpha=glint;c.beginPath();c.moveTo(0,-4);c.quadraticCurveTo(1,-1,4,0);c.quadraticCurveTo(1,1,0,4);c.quadraticCurveTo(-1,1,-4,0);c.quadraticCurveTo(-1,-1,0,-4);c.fillStyle='#fff8d3';c.fill();c.restore();}
  }
  // A vector cut-out rig: shoulders stay on the torso, below the face.
  frog(x,y,gait,grounded,vy,time,voice=0,impact=0,dead=false,hat='none') {
    const c=this.ctx,walking=grounded && Math.abs(gait-this.previousGait)>0.002;
    this.previousGait=gait;
    const motion=grounded?(walking?Math.sin(gait):Math.sin(time*2)*.08):0;
    const bounce=grounded?Math.abs(motion)*1.6:0;
    const squash=1-impact*.15;
    c.save();c.translate(x,y);
    if(dead){c.rotate(Math.min(.6,(time%1)*.6));c.globalAlpha=.65;}
    c.lineCap='round';c.lineJoin='round';
    const backFoot={x:-14-motion*8,y:grounded?-Math.max(0,-motion)*8:vy<0?-9:-1};
    const frontFoot={x:13+motion*8,y:grounded?-Math.max(0,motion)*8:vy<0?-7:1};
    const hipY=-15-bounce;
    const limbs=[[-11,hipY,-21,-10+motion*4,backFoot.x,backFoot.y,'#669944'],[10,hipY,21,-9-motion*4,frontFoot.x,frontFoot.y,'#78a94c']];
    for(const [hx,hy,kx,ky,fx,fy,col] of limbs){c.beginPath();c.moveTo(hx,hy);c.quadraticCurveTo(kx,ky,fx,fy-2);c.strokeStyle=col;c.lineWidth=8;c.stroke();ellipse(c,fx+4,fy-1,10,3.4,col);}
    c.save();c.translate(0,-bounce+impact*3);c.scale(1+impact*.08,squash);
    // Back arm, pear shaped body and soft belly.
    line(c,[[-17,-23],[-26,-17+motion*2],[-26,-10]],'#71a448',6);
    c.beginPath();c.moveTo(-23,-22);c.bezierCurveTo(-26,-40,-18,-54,-3,-53);c.bezierCurveTo(16,-58,30,-44,25,-24);c.bezierCurveTo(28,-9,9,-5,-9,-8);c.bezierCurveTo(-19,-9,-24,-13,-23,-22);c.fillStyle='#8fbc58';c.fill();
    ellipse(c,6,-23,17,13,'#b5cf79');
    // Eyes are separate pivots; blinks are gentle and deterministic.
    const blink=(Math.sin(time*.8)>.992)?0.12:1;
    for(const [ex,ey] of [[-11,-48],[15,-49]]){
      ellipse(c,ex,ey,12,13,'#83ae4d');ellipse(c,ex+1,ey-1,9.5,10.5*blink,'#fcfbe4');
      if(blink>.5){ellipse(c,ex+3,ey-1,3.1,4.4,'#334e36');ellipse(c,ex+4,ey-3,1,1.3,'#fffef1');}
    }
    ellipse(c,-14,-31,4.5,2.6,'#c3b677');ellipse(c,22,-32,4,2.5,'#c3b677');
    if(voice>.66||!grounded){ellipse(c,8,-32,5+voice*2,4+voice*4,'#4f723d');ellipse(c,9,-29,3,1.6,'#b88d69');}
    else{c.beginPath();c.moveTo(0,-33);c.quadraticCurveTo(9,-25,18,-33);c.strokeStyle='#46663c';c.lineWidth=1.7;c.stroke();}
    const armY=grounded?-9-motion*3:-27;
    line(c,[[18,-22],[27,-16],[30,armY]],'#7ca94c',5);ellipse(c,30,armY,4,3,'#7ca94c');
    drawHat(c,hat);
    c.restore();c.restore();
    this.joints={hip:[x,y+hipY],leftFoot:[x+backFoot.x,y+backFoot.y],rightFoot:[x+frontFoot.x,y+frontFoot.y]};
  }
  render(sim,{time=sim.time,voice=0,menu=false}={}) {
    // A bitmap resize and the complete redraw occur together in this JS task.
    this.applyResize();
    const c=this.ctx,W=this.width,H=this.height,off=H-540,p=sim.player;
    c.setTransform(this.scale,0,0,this.scale,0,0);
    const target=Math.max(0,Math.min(sim.level.finish-W*.48,p.x-W*.25));
    if(!menu)sim.camera+=(target-sim.camera)*.09;
    const camera=sim.camera;
    this.background(sim.level,time,camera);
    c.save();c.translate(-camera,off);
    // Terrain and all decoration are culled against the camera.
    sim.level.platforms.forEach((platform,index)=>{
      const [x,y,w]=platform;if(x+w<camera-70||x>camera+W+70)return;
      c.drawImage(this.platformTexture(sim.level,platform,index),x-8,y-3);
      const rng=seeded(sim.level.seed+index*71);
      for(let i=0;i<w/57;i++){
        const px=x+16+rng()*(w-32),scale=.22+rng()*.28;
        if(i%4===0)this.foliage(px,y,scale,i,time);
        else this.flower(px,y-1,i%3?'#f5edc0':'#e3b69a',i,time);
      }
    });
    for(const [x,text] of sim.level.signs){if(x<camera-70||x>camera+W+70)continue;const platform=sim.level.platforms.find(([px,,w])=>x>=px&&x<=px+w);if(platform)this.sign(x,platform[1],text);}
    const checkPlat=sim.level.platforms.find(([x,,w])=>sim.level.checkpoint>=x&&sim.level.checkpoint<=x+w);
    if(sim.level.checkpoint>camera-60&&sim.level.checkpoint<camera+W+60)this.flag(sim.level.checkpoint,checkPlat[1],sim.checkpoint,time);
    if(sim.level.finish>camera-150&&sim.level.finish<camera+W+100)this.home(sim.level.finish+10,430,time);
    for(const [x,y,w] of sim.level.hazards)if(x>camera-40&&x<camera+W+40)this.hazard(x,y,w,time);
    sim.level.coins.forEach(([x,y],i)=>{
      if(sim.collected.has(i)||x<camera-30||x>camera+W+30)return;
      this.coin(x,y,time,i);
    });
    if(!p.dead){const ground=sim.level.platforms.find(([x,,w])=>p.x>=x&&p.x<=x+w);if(ground){const h=Math.max(0,ground[1]-p.y);ellipse(c,p.x,ground[1]+2,Math.max(7,23-h*.05),3.5,'#3c633a25');}}
    this.frog(p.x,p.y,menu?0:sim.gait,p.grounded,p.vy,time,voice,sim.landImpact,p.dead,this.hat||'none');
    for(const particle of sim.particles){c.globalAlpha=Math.min(1,particle.life/.2);c.save();c.translate(particle.x,particle.y);c.rotate(particle.life*4);round(c,-particle.size/2,-particle.size/2,particle.size,particle.size*.65,1,particle.color);c.restore();}c.globalAlpha=1;
    c.restore();
    // Foreground reeds frame the start; their motion follows the same breeze.
    if(camera<240){c.save();c.translate(-camera*.8,off);this.foliage(22,549,1.65,0,time);this.foliage(58,558,1.1,2,time);c.restore();}
  }
}

export function renderAvatar(canvas,hat='none') {
  const c=canvas.getContext('2d');
  c.clearRect(0,0,canvas.width,canvas.height);
  c.save();c.scale(canvas.width/200,canvas.height/170);
  ellipse(c,100,147,32,5,'#66864c22');
  c.translate(100,143);c.scale(1.25,1.25);
  Renderer.prototype.frog.call({ctx:c,previousGait:0},0,0,0,true,0,0,0,0,false,hat);
  c.restore();
}
