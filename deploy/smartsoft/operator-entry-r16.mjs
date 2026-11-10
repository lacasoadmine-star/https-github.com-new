import {approvedOperatorSmartsoft} from './remaining20-release-approval.mjs';
import {releaseReadiness} from '../release-policy.mjs';
import {createOperatorRelease,OPERATOR_RELEASE_ID} from './operator-policy-r16.mjs';
import policy from './operator-policy-r16.json' with {type:'json'};

export const operationalOperatorSmartsoft=createOperatorRelease(approvedOperatorSmartsoft,{
 policy,readiness:releaseReadiness,
 isEnabled:()=>process.env.REMAINING20_OPERATOR_ETB_RELEASE===OPERATOR_RELEASE_ID,
});
export const operatorStartAllowed=operationalOperatorSmartsoft.operatorCanStart;
