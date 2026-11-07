import {fail} from './jetx-rules.mjs';

// The Worker authenticates through the platform's actual machine-session route.
// Only a digest of its HttpOnly session cookie crosses this signed server link.
// Resolve the account again against the same canonical session table used by
// the existing slot engine. Older sessions can store either raw or hashed keys.
export async function resolveSessionUser(shared,subject,now=Date.now()){
 const digest=typeof subject==='string'&&subject.match(/^@session:([a-f0-9]{64})$/)?.[1];
 if(!digest)fail('PLAYER_LOGIN_REQUIRED',401);
 const rows=await shared.sql.unsafe(`SELECT u.id,u.role,u.status
  FROM sw_rebuild.sessions s JOIN sw_rebuild.users u ON u.id=s.user_id
  WHERE s.expires>$2 AND (s.token=$1 OR encode(sha256(convert_to(s.token,'UTF8')),'hex')=$1)`,[digest,now]);
 if(rows.length!==1||rows[0].role!=='player'||rows[0].status!=='active')fail('ACTIVE_PLAYER_SESSION_REQUIRED',401);
 return rows[0].id;
}
