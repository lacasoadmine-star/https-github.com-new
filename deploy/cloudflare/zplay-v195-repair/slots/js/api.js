// Reuse the existing HttpOnly Player session; no new login or test account.
const ROOT='/api/slots';
async function call(path,{method='GET',body,signal}={}){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),method==='GET'?12000:25000);
 const abort=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
 let response;
 try{response=await fetch(ROOT+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin',cache:'no-store',signal:controller.signal});}
 catch(error){if(error.name==='AbortError')throw new Error(method==='GET'?'The connection timed out. Please retry.':'The server has not confirmed this round. Retry to check the same round.');throw error;}
 finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
 let data;try{data=await response.json();}catch{const error=new Error('The server response was unreadable. Retry to confirm the same request.');error.code='UNREADABLE_RESPONSE';throw error;}
 if(!response.ok){const error=new Error(response.status===401?'Sign in to your existing Player account from Home.':data.detail||`HTTP_${response.status}`);error.status=response.status;error.code=typeof data.detail==='string'?data.detail:`HTTP_${response.status}`;throw error;}return data;
}
export const playerLoggedIn=async()=>{try{return (await call('/session')).authenticated===true;}catch{return false;}};
export function playerLogin(){location.assign('/');}
export const games=()=>call('/games');export const game=id=>call('/games/'+encodeURIComponent(id));
export const wallet=()=>call('/balance');export const rounds=()=>call('/rounds');
export const spin=(gameId,bet,roundToken)=>call('/spin',{method:'POST',body:{gameId,bet,roundToken}});
export const gamble=(roundId,choice,roundToken)=>call('/gamble',{method:'POST',body:{roundId,choice,roundToken}});
export const pick=(roundId,index,roundToken)=>call('/bonus/pick',{method:'POST',body:{roundId,index,roundToken}});

// Only explicit precondition failures are final. Timeouts, rate limits and
// REQUEST_IN_PROGRESS may follow a committed attempt and retain the token.
const rejectedCodes=new Set(['GAME_BET_OR_TOKEN_INVALID','INVALID_AMOUNT','INSUFFICIENT_FUNDS','FREE_SPIN_BET_LOCKED','INVALID_ACTION','INVALID_CHOICE','INVALID_PICK','NO_GAMBLE_WINNINGS','GAMBLE_NOT_AVAILABLE','GAMBLE_LIMIT','GAMBLE_EXPIRED','BONUS_NOT_AVAILABLE','BONUS_ALREADY_COLLECTED']);
export const isDefiniteRejection=error=>error?.status>=400&&error.status<500&&rejectedCodes.has(error.code);
