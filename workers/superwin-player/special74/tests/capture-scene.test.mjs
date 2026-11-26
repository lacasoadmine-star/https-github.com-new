import test from 'node:test';
import assert from 'node:assert/strict';
import {readPresentation} from '../tools/capture-scene.mjs';

test('presentation evidence strips query, fragment and credentials from texture URLs while retaining control names',()=>{
 const keys=['window','location','innerWidth','innerHeight','devicePixelRatio'];
 const prior=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 try{
  const texture={textureCacheIds:['Buttons/SpinVertical','https://user:secret@static.ssg-public.com/a.png?signature=private#token','relative.png?session=private','blob:https://example.com/private'],baseTexture:{imageUrl:'https://user:secret@static.ssg-public.com/Content/image.png?session=private#token'}};
  const stage={visible:true,worldAlpha:1,texture,x:0,y:0,scale:{x:1,y:1},rotation:0,alpha:1,getBounds:()=>({x:0,y:0,width:10,height:10}),children:[]};
  Object.assign(globalThis,{location:{href:'https://eu-server.ssgportal.com/Game/index.html?Token=DEMO'},innerWidth:100,innerHeight:200,devicePixelRatio:1,window:{__special74Views:[{renderer:{view:{getBoundingClientRect:()=>({x:0,y:0,width:100,height:200})},width:100,height:200,resolution:1},stage}]}});
  let result=readPresentation().canvases[0].scene.texture;
  assert.equal(result.source,'https://static.ssg-public.com/Content/image.png');
  assert.deepEqual(result.names,['Buttons/SpinVertical','https://static.ssg-public.com/a.png','relative.png']);
  delete texture.baseTexture.imageUrl;texture.baseTexture.resource={url:'../Content/atlas.png?session=private#token'};
  result=readPresentation().canvases[0].scene.texture;
  assert.equal(result.source,'https://eu-server.ssgportal.com/Content/atlas.png');
  texture.baseTexture.resource.url='data:image/png;base64,private';
  assert.equal(readPresentation().canvases[0].scene.texture.source,null);
 }finally{for(const [key,descriptor]of prior){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});

test('destroyed or detached loader views cannot hide an active game snapshot',()=>{
 const keys=['window','location','innerWidth','innerHeight','devicePixelRatio'];
 const prior=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 try{
  const bounds=()=>({x:0,y:0,width:10,height:10});
  const stage={visible:true,worldAlpha:1,x:0,y:0,scale:{x:1,y:1},rotation:0,alpha:1,getBounds:bounds,children:[]};
  const view={isConnected:true,getBoundingClientRect:bounds};
  const renderer={view,width:10,height:10,resolution:1};
  Object.assign(globalThis,{location:{href:'https://eu-server.ssgportal.com/Game/'},innerWidth:100,innerHeight:200,devicePixelRatio:1,window:{__special74Views:[
   {renderer:{...renderer,view:null},stage},
   {renderer:{...renderer,view:{...view,isConnected:false}},stage},
   {renderer,stage:{...stage,destroyed:true}},
   {renderer,stage:{...stage,getBounds(){throw Error('stale loader');}}},
   {renderer,stage:{...stage,children:[{...stage,_destroyed:true}]}}
  ]}});
  const result=readPresentation();
  assert.equal(result.canvases.length,1);
  assert.equal(result.canvases[0].scene.path,'4');
  assert.deepEqual(result.canvases[0].scene.children,[]);
  assert.deepEqual(result.snapshotErrors,[{viewIndex:3,reason:'presentation-view-unreadable'}]);
 }finally{for(const [key,descriptor]of prior){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
