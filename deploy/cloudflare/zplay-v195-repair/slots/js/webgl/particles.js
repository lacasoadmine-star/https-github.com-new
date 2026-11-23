/** Instanced additive glow particles, one draw call regardless of particle count. */
const vert=`#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec4 particle; // x,y,size,lifeFraction
layout(location=2) in vec3 tint;
uniform vec2 resolution;
out vec2 uv;out vec4 glow;
void main(){vec2 pt=particle.xy+(corner-.5)*particle.z;
  gl_Position=vec4(pt/resolution*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
  uv=corner;glow=vec4(tint,particle.w);
}`;
const frag=`#version 300 es
precision mediump float;in vec2 uv;in vec4 glow;out vec4 color;
void main(){float d=length(uv-.5)*2.;float a=pow(max(0.,1.-d),1.8)*glow.w;
 color=vec4(glow.rgb*a,a);
}`;
const chance=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
const COLORS={gold:[1,.72,.22],fire:[1,.31,.08],spark:[.82,.96,1],green:[.27,1,.52]};
export class ParticleLayer{
  constructor(canvas,maxParticles=5000){
    this.canvas=canvas;this.max=maxParticles;this.count=0;this.pool=new Float32Array(this.max*9);this.data=new Float32Array(this.max*7);
    this.gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'high-performance'});
    if(!this.gl){this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('CANVAS_UNAVAILABLE');this.resize();return;}
    const gl=this.gl;const compile=(kind,src)=>{const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(this.program);
    if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.max*7*4,gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,28,0);gl.vertexAttribDivisor(1,1);
    gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,28,16);gl.vertexAttribDivisor(2,1);
    this.resize();
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);const d=Math.min(window.devicePixelRatio||1,2,Math.sqrt(8294400/(this.w*this.h)));this.dpr=d;this.canvas.width=Math.round(this.w*d);this.canvas.height=Math.round(this.h*d);if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  burst(x,y,{count=90,color='gold',speed=290,life=.9,gravity=280,angle=-Math.PI/2,spread=Math.PI*2}={}){const colors=Object.keys(COLORS),ci=Math.max(0,colors.indexOf(color));for(let n=0;n<count&&this.count<this.max;n++){const a=angle+(chance()-.5)*spread,v=speed*(.25+chance()*.9),i=this.count++*9;this.pool.set([x,y,Math.cos(a)*v,Math.sin(a)*v,0,life*(.45+chance()),5+chance()*16,ci,gravity],i);}}
  fire(x,y){this.burst(x,y,{count:500,color:'fire',speed:390,gravity:360,spread:Math.PI*1.3});}
  sparks(x,y){this.burst(x,y,{count:26,color:'spark',speed:180,life:.4,gravity:190});}
  fountain(x,y){this.burst(x,y,{count:300,color:'gold',speed:470,angle:-Math.PI/2,spread:Math.PI*.7,life:1.3});}
  update(dt){dt=Math.min(.05,Math.max(0,dt));for(let i=0;i<this.count;){const j=i*9;this.pool[j+4]+=dt;if(this.pool[j+4]>=this.pool[j+5]){this.count--;this.pool.copyWithin(j,this.count*9,this.count*9+9);continue;}this.pool[j]+=this.pool[j+2]*dt;this.pool[j+1]+=this.pool[j+3]*dt;this.pool[j+3]+=this.pool[j+8]*dt;i++;}}
  render(){const colors=Object.values(COLORS);if(!this.gl){const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);c.globalCompositeOperation='lighter';for(let i=0;i<this.count;i++){const j=i*9,rgb=colors[this.pool[j+7]];c.globalAlpha=1-this.pool[j+4]/this.pool[j+5];c.fillStyle=`rgb(${rgb.map(x=>Math.round(x*255)).join(',')})`;c.beginPath();c.arc(this.pool[j],this.pool[j+1],this.pool[j+6]/3,0,Math.PI*2);c.fill();}c.globalAlpha=1;return;}
    const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);if(!this.count)return;for(let i=0;i<this.count;i++){const p=i*9,j=i*7,rgb=colors[this.pool[p+7]];this.data[j]=this.pool[p];this.data[j+1]=this.pool[p+1];this.data[j+2]=this.pool[p+6];this.data[j+3]=Math.max(0,1-this.pool[p+4]/this.pool[p+5]);this.data[j+4]=rgb[0];this.data[j+5]=rgb[1];this.data[j+6]=rgb[2];}
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.uniform2f(gl.getUniformLocation(this.program,'resolution'),this.w,this.h);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,this.count*7));gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,this.count);
  }
}
