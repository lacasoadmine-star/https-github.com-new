// A retry may replace the launch image. Old visual conclusions must not attach to it.
export function reviewState(review, screenshot) {
 const hash=review?.screenshotSha256;
 const matches=typeof hash==='string'&&/^[a-f0-9]{64}$/.test(hash)&&hash===screenshot?.sha256;
 return {
  visualReviewMatchesScreenshot:matches,
  visualReviewNeedsRefresh:Boolean(review)&&!matches,
  idleLayoutVisuallyReviewed:matches&&review.idlePresentationVisible===true,
  loaderOnlyVisuallyReviewed:matches&&review.idlePresentationVisible===false
 };
}
