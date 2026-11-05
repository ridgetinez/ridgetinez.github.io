// Instanced cells retain the original screen-aligned lattice and painter order.
// Geometry/physics stay in garden.js; the GPU replaces thousands of fillText calls.
export function createGardenGL(canvas) {
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:true,depth:false,stencil:false});
  if(!gl)return null;
  const vertex=`#version 300 es
  precision highp float;
  layout(location=0) in vec2 origin;
  layout(location=1) in vec4 colour;
  layout(location=2) in vec3 glyph;
  uniform vec2 screen;uniform vec2 view;uniform float viewX;uniform float dpr;
  out vec2 local;flat out vec4 cellColour;flat out vec3 cellGlyph;flat out vec2 anchor;
  const vec2 cell=vec2(8.5,9.5);
  const vec2 corners[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));
  void main(){
    local=mix(vec2(-.5/dpr),cell+vec2(.5/dpr),corners[gl_VertexID]);
    vec2 p=origin+local;gl_Position=vec4((p.x-viewX)/view.x*2.-1.,1.-p.y/view.y*2.,0,1);
    vec2 phase=floor(fract((origin+cell*.5)*dpr)*4.+.01);
    cellColour=colour;cellGlyph=vec3(glyph.x+11.*(phase.x+4.*phase.y),glyph.yz);anchor=vec2(8.)+phase*.25/dpr;
  }`;
  const fragment=`#version 300 es
  precision highp float;
  in vec2 local;flat in vec4 cellColour;flat in vec3 cellGlyph;flat in vec2 anchor;
  uniform sampler2D letters;uniform float dpr;uniform vec2 screen;uniform float gutter;uniform float viewX;
  out vec4 result;
  void main(){
    float x=gl_FragCoord.x/dpr+viewX;if(x>=gutter&&x<screen.x-gutter)discard;
    vec2 edge=vec2(7.85,8.85);
    vec2 cover=clamp(local*dpr+vec2(.5),0.,1.)*clamp((edge-local)*dpr+vec2(.5),0.,1.);
    float a=cellColour.a*cover.x*cover.y;
    vec2 q=local-vec2(4.25,4.75)+anchor;
    float mask=texture(letters,vec2((cellGlyph.x*16.+q.x)/(16.*176.),q.y/16.)).a;
    float inkA=mask*cellGlyph.y;
    vec3 ink=cellGlyph.z<.5?vec3(24,52,42)/255.:(cellGlyph.z<1.5?vec3(91,43,22)/255.:vec3(24,45,31)/255.);
    result=vec4(ink*inkA+cellColour.rgb*a*(1.-inkA),inkA+a*(1.-inkA));
  }`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  for(const [location,size,offset] of [[0,2,0],[1,4,2],[2,3,6]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,36,offset*4);gl.vertexAttribDivisor(location,1);}
  let data=new Float32Array(65536*9),used=0,density=0;
  gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
  const letters=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,letters);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const uniforms=Object.fromEntries(['screen','view','viewX','dpr','gutter','letters'].map(name=>[name,gl.getUniformLocation(program,name)]));
  return {
    resize(width,height,dpr,view={x:0,width}){
      canvas.width=Math.round(view.width*dpr);canvas.height=Math.round(height*dpr);gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.screen,width,height);gl.uniform2f(uniforms.view,view.width,height);gl.uniform1f(uniforms.viewX,view.x);gl.uniform1f(uniforms.dpr,dpr);
      if(density!==dpr){
        density=dpr;const atlas=typeof document==='undefined'?new OffscreenCanvas(1,1):document.createElement('canvas');atlas.width=16*176*dpr;atlas.height=16*dpr;
        const ctx=atlas.getContext('2d',{willReadFrequently:true});ctx.scale(dpr,dpr);ctx.font='7.5px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
        const glyphs='.,:;=+x%#/'+String.fromCharCode(92);
        for(let py=0;py<4;py++)for(let px=0;px<4;px++)for(let i=0;i<11;i++)ctx.fillText(glyphs[i],(i+11*(px+4*py))*16+8+px*.25/dpr-(i<9?.1:0),8+py*.25/dpr);
        gl.bindTexture(gl.TEXTURE_2D,letters);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
      }
    },
    begin(gutter){used=0;gl.uniform1f(uniforms.gutter,gutter);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);},
    cell(x,y,r,g,b,alpha,glyph,inkAlpha,kind){
      if(used+9>data.length){const next=new Float32Array(data.length*2);next.set(data);data=next;gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);}
      data[used++]=x;data[used++]=y;data[used++]=r/255;data[used++]=g/255;data[used++]=b/255;data[used++]=alpha;data[used++]=glyph;data[used++]=inkAlpha;data[used++]=kind;
    },
    flush(){gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,used));gl.drawArraysInstanced(gl.TRIANGLES,0,6,used/9);return used/9;},
    dispose(){gl.deleteBuffer(buffer);gl.deleteTexture(letters);gl.deleteVertexArray(vao);gl.deleteProgram(program);},
    get cells(){return used/9;}
  };
}

// Keep transparent graphics surfaces out of the scrolling feed. Both renderers
// use global cell coordinates, so splitting the surface does not move the art.
export function createGardenPair(leftCanvas,rightCanvas) {
  const left=createGardenGL(leftCanvas);if(!left)return null;
  const right=createGardenGL(rightCanvas);if(!right){left.dispose();return null;}
  let width=0,gutter=0;
  return {
    resize(w,h,dpr){
      width=w;gutter=Math.max(0,(w-480)/2-26);
      for(const [canvas,side] of [[leftCanvas,'left'],[rightCanvas,'right']]){canvas.style.position='absolute';canvas.style.top='0';canvas.style[side]='0';canvas.style.width=`${gutter}px`;canvas.style.height=`${h}px`;}
      left.resize(w,h,dpr,{x:0,width:gutter});right.resize(w,h,dpr,{x:w-gutter,width:gutter});
    },
    begin(g){gutter=g;left.begin(g);right.begin(g);},
    cell(x,y,r,g,b,a,glyph,ink,kind){
      if(x<gutter)left.cell(x,y,r,g,b,a,glyph,ink,kind);
      if(x+8.5>width-gutter)right.cell(x,y,r,g,b,a,glyph,ink,kind);
    },
    flush(){return left.flush()+right.flush();},
    dispose(){left.dispose();right.dispose();}
  };
}
