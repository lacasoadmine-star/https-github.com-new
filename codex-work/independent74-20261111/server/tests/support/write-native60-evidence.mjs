// Optional test evidence only. No live database or user account data is read.
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function writeNative60Evidence(name,report){
 const directory=process.env.NATIVE60_EVIDENCE_DIR;if(!directory)return;
 if(!/^(?:native|demo)60-five-rounds\.json$/.test(name))throw Error('TEST_EVIDENCE_NAME_REQUIRED');
 await mkdir(directory,{recursive:true});
 await writeFile(join(directory,name),JSON.stringify({format:'isolated-current60-five-rounds-v1',isolated:true,realPlayerFundsUsed:false,productionDatabaseConnected:false,productionWagers:0,...report},null,2)+'\n');
}
