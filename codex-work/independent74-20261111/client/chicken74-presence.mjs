// Presence renewals use the existing authenticated, idempotent action transport.
// The browser never submits a disconnect time, settlement or cash-out amount.
export const CHICKEN_HEARTBEAT_MS=2000;
const ID='ind74_official_chickenhighway';
export function hasChickenPresence(definition){
  const policy=definition?.connectionPolicy;
  return definition?.id===ID&&definition.family==='ladder'&&policy?.kind==='authenticated-presence-lease'&&
    policy.heartbeatAction==='sync'&&policy.heartbeatIntervalMs===CHICKEN_HEARTBEAT_MS&&
    policy.disconnectAfterMs===8000&&policy.timeoutComparison==='strictly-greater'&&policy.stateReadsRenew===false;
}
export function pendingChickenSync(pending){
  const body=pending?.body;
  return body?.type==='action'&&body.game_id===ID&&body.action==='sync'&&
    body.input!==null&&typeof body.input==='object'&&!Array.isArray(body.input)&&Object.keys(body.input).length===0;
}
export function canSyncChickenPresence(definition,snapshot,{hidden=false,working=false,refreshing=false,pending=null,disposed=false,needsRefresh=false}={}){
  const round=snapshot?.round;
  return hasChickenPresence(definition)&&!hidden&&!working&&!refreshing&&!pending&&!disposed&&!needsRefresh&&
    snapshot?.recovery_required!==true&&round?.recovery_required!==true&&round?.previous_model!==true&&
    round?.status==='active'&&round.allowedActions?.includes('sync')===true&&
    (round.game_id??round.gameId)===definition.id;
}
export async function renewChickenPresence(api,{retry=false}={}){
  const gameId=api.gameId;
  if(gameId!==ID||retry&&!pendingChickenSync(api.pending))throw new TypeError('A matching Chicken presence request is required.');
  if(!retry)return api.act('sync',{});
  // An idempotent replay can return the original lease receipt even if the
  // server has settled since. Read current state before any further GO/AUTO.
  await api.retryPending();
  return api.state(gameId);
}
