"""Add this independent model's metadata and verified pose bindings."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def paths(pose):
 children={};out={}
 for n in pose['nodes']:children.setdefault(n['parent'],[]).append(n)
 def walk(n,path):
  out[n['id']]=path
  if n.get('spine'):return
  for i,child in enumerate(children.get(n['id'],[])):walk(child,path+'/'+str(i))
 walk(pose['nodes'][0],'0');return out
def main():
 path=ROOT/'native-machines/safari-simba-2/profile.json';p=json.loads(path.read_text());base=p['poses']['portrait'];source_paths=paths(base)
 for key,pose in p['poses'].items():
  if key=='portrait' or pose.get('bindings'):continue
  targets={v:k for k,v in paths(pose).items()};bindings={}
  for name,id in base['bindings'].items():
   other=targets.get(source_paths.get(id));assert other is not None,name
   a=base['nodes'][id];b=pose['nodes'][other];assert a['type']==b['type'],name
   if 'text'in a:assert 'text'in b,name
   bindings[name]=other
  pose['bindings']=bindings
  statefile=ROOT/'games/safari-simba-2/09-network'/('state-13-phone-landscape-844x390.json'if key=='landscape'else'state-12-mobile-390x844.json')
  state=json.loads(statefile.read_text());canvas=next(c for f in state['frames']for c in f['canvas']);pose['canvas']={'width':canvas['width'],'height':canvas['height'],'css':canvas['box']}
 meta=json.loads(subprocess.run(['node','--input-type=module','-e',"import{createSafariSlotCore}from'./native-machines/safari-simba-2/server/wrapper.mjs';console.log(JSON.stringify(createSafariSlotCore({MATH:{games:{fresh_safarisimba:{}}},publicGames:()=>[{id:'fresh_safarisimba'}]},{sha256:'"+json.loads((ROOT/'native-machines/safari-simba-2/server/release/metadata.json').read_text())['modelSha256']+"',enabled:true}).publicGames()[0]));"],cwd=ROOT,capture_output=True,text=True,check=True).stdout)
 p['backendKind']='safari';p['backendToNative']={str(i):i for i in range(9)}
 p['backendGame']={**meta,'columns':3,'version':meta['mathVersion'],'stakeValues':meta['betLevels'],'minStake':meta['betLevels'][0],'maxStake':meta['betLevels'][-1],'paylines':meta['linePaths'],'symbols':[{'id':str(i),'name':s.title(),'pays':{'3':meta['paytable'][s]['3']}}for i,s in enumerate(meta['symbols'])],'math':{'nativeReturn':{'percent':'96.39'}}}
 path.write_text(json.dumps(p,separators=(',',':')))
 print(json.dumps({'poses':{k:len(v['bindings'])for k,v in p['poses'].items()},'model':meta['mathVersion']}))
if __name__=='__main__':main()
