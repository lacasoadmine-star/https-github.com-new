import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewState} from '../tools/review-state.mjs';
const original='a'.repeat(64), retry='b'.repeat(64);
test('a retry invalidates the old image review without promoting a loader to ready',()=>{
 const previous={screenshotSha256:original,idlePresentationVisible:true};
 assert.equal(reviewState(previous,{sha256:original}).idleLayoutVisuallyReviewed,true);
 const next=reviewState(previous,{sha256:retry});
 assert.equal(next.visualReviewNeedsRefresh,true);
 assert.equal(next.idleLayoutVisuallyReviewed,false);
 assert.equal(next.loaderOnlyVisuallyReviewed,false);
});
test('missing image evidence never inherits a visual review',()=>{
 assert.equal(reviewState({screenshotSha256:original,idlePresentationVisible:true},null).idleLayoutVisuallyReviewed,false);
 assert.equal(reviewState({idlePresentationVisible:true},{}).visualReviewMatchesScreenshot,false);
 assert.equal(reviewState(null,{sha256:original}).visualReviewNeedsRefresh,false);
});
test('a reviewed loader is only classified for its matching screenshot',()=>{
 assert.equal(reviewState({screenshotSha256:original,idlePresentationVisible:false},{sha256:original}).loaderOnlyVisuallyReviewed,true);
 assert.equal(reviewState({screenshotSha256:original,idlePresentationVisible:false},{sha256:retry}).loaderOnlyVisuallyReviewed,false);
});
