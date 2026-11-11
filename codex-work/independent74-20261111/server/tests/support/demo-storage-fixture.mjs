// Isolated storage fixture. Data and alarm writes commit/roll back together,
// matching the Durable Object transaction contract. No real timer or namespace.
export function createDemoStorageFixture({beforeOperation}={}){
  const data=new Map();let chain=Promise.resolve(),alarmAt=null;
  return {data,get alarmAt(){return alarmAt;},storage:{transaction(operation){
    const run=chain.then(async()=>{
      const next=structuredClone(data);let nextAlarm=alarmAt;
      const check=(kind,key)=>beforeOperation?.(kind,key);
      const tx={
        get:async key=>{await check('get',key);return structuredClone(next.get(key));},
        put:async(key,value)=>{await check('put',key);next.set(key,structuredClone(value));},
        getAlarm:async()=>nextAlarm,
        setAlarm:async value=>{await check('setAlarm');if(!Number.isSafeInteger(value)||value<0)throw Error('INVALID_FIXTURE_ALARM');nextAlarm=value;},
        deleteAlarm:async()=>{await check('deleteAlarm');nextAlarm=null;},
      };
      const result=await operation(tx);
      data.clear();for(const [key,value]of next)data.set(key,value);alarmAt=nextAlarm;return result;
    });chain=run.catch(()=>{});return run;
  }}};
}
