import {parse} from './node_modules/acorn/dist/acorn.mjs';
const roots=new Set(['game','gameInfo','gameSounds','gameSound','gameImages','gameSpines','gameSprite','slot','Box','Win','AutoPlay','Bets','Double','Start','Footer','Header','Menu','Line','RiskGame','BuyBonus','BuyFeature','FreeSpin','Multiplier']);
function path(node){
 if(node?.type==='Identifier')return node.name;
 if(node?.type!=='MemberExpression')return null;
 const base=path(node.object),key=node.computed?node.property.type==='Literal'?String(node.property.value):null:node.property.name;
 return base&&key!==null?base+'.'+key:null;
}
function literal(node){
 if(!node)return {known:false};
 if(node.type==='Literal'&&!node.regex&&typeof node.value!=='bigint')return {known:true,value:node.value};
 if(node.type==='TemplateLiteral'&&!node.expressions.length)return {known:true,value:node.quasis[0].value.cooked};
 if(node.type==='UnaryExpression'&&['-','+','!'].includes(node.operator)){
  const a=literal(node.argument);if(a.known&&['number','boolean'].includes(typeof a.value))return {known:true,value:node.operator==='-'?-a.value:node.operator==='+'?+a.value:!a.value};
 }
 if(node.type==='ArrayExpression'){const items=node.elements.map(literal);if(items.every(i=>i.known))return {known:true,value:items.map(i=>i.value)};}
 if(node.type==='ObjectExpression'){
  const entries=[];
  for(const property of node.properties){if(property.type!=='Property'||property.computed||property.kind!=='init')return {known:false};const value=literal(property.value);if(!value.known)return {known:false};entries.push([property.key.name??property.key.value,value.value]);}
  return {known:true,value:Object.fromEntries(entries)};
 }
 return {known:false};
}
export function extractPublicConfig(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true}),fields=[];let dynamic=0;
 function values(name,node,context){
  const value=literal(node);
  if(value.known){fields.push({path:name,value:value.value,conditional:context.length>0,conditions:context,offset:node.start});return;}
  if(node?.type==='ObjectExpression'){
   for(const p of node.properties)if(p.type==='Property'&&!p.computed&&p.kind==='init')values(name+'.'+(p.key.name??p.key.value),p.value,context);else dynamic++;
  }else dynamic++;
 }
 function visit(node,context=[]){
  if(!node||typeof node!=='object')return;
  if(/Function/.test(node.type)||['ClassDeclaration','ClassExpression'].includes(node.type))return;
  if(node.type==='IfStatement'){
   const condition=source.slice(node.test.start,node.test.end).slice(0,500);
   visit(node.consequent,[...context,condition]);if(node.alternate)visit(node.alternate,[...context,'!('+condition+')']);return;
  }
  if(node.type==='VariableDeclarator'){
   if(node.id?.type==='Identifier'&&roots.has(node.id.name)&&node.init)values(node.id.name,node.init,context);
   return;
  }
  // Do not promote values inside runtime loops, switches, or exception paths
  // to unconditional configuration. They require a separate dynamic analysis.
  if(['ForStatement','ForInStatement','ForOfStatement','WhileStatement','DoWhileStatement','SwitchStatement','TryStatement'].includes(node.type)){
   dynamic++;return;
  }
  if(node.type==='AssignmentExpression'){
   const name=path(node.left);
   if(name&&roots.has(name.split('.')[0])&&node.operator==='=')values(name,node.right,context);
   return;
  }
  for(const[key,value]of Object.entries(node))if(!['start','end','loc'].includes(key)){
   if(Array.isArray(value))for(const child of value)visit(child,context);else if(value&&typeof value==='object')visit(value,context);
  }
 }
 visit(ast);return {fields,dynamicAssignmentsNotEvaluated:dynamic};
}
