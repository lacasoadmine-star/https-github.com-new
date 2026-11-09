// Activate only an immutable, previously hash-verified version on an existing Worker.
export async function activateVerifiedRelease(input) {
  if (accountId !== input.account) throw new Error('ACCOUNT_CHANGED');
  const root='/accounts/'+accountId+'/workers';
  const [latest,deployment,staged]=await Promise.all([
    cloudflare.request({method:'GET',path:root+'/workers/'+input.worker+'/versions/latest'}),
    cloudflare.request({method:'GET',path:root+'/scripts/'+input.worker+'/deployments',query:{per_page:1}}),
    cloudflare.request({method:'GET',path:root+'/workers/'+input.worker+'/versions/'+input.versionId}),
  ]);
  const active=deployment.result.deployments[0].versions;
  if (latest.result.id!==input.versionId || staged.result.main_module!==input.mainModule) throw new Error('STAGED_VERSION_CHANGED');
  if (active.length!==1 || active[0].percentage!==100 || active[0].version_id!==input.previousVersionId) throw new Error('ACTIVE_VERSION_CHANGED');
  if (input.requiredLibraryVersion) {
    const library=await cloudflare.request({method:'GET',path:root+'/scripts/superwin-library-100/deployments',query:{per_page:1}});
    const versions=library.result.deployments[0].versions;
    if (versions.length!==1 || versions[0].percentage!==100 || versions[0].version_id!==input.requiredLibraryVersion) throw new Error('LIBRARY_DEPENDENCY_NOT_ACTIVE');
  }
  const result=await cloudflare.request({method:'POST',path:root+'/scripts/'+input.worker+'/deployments',body:{strategy:'percentage',versions:[{version_id:input.versionId,percentage:100}],annotations:{'workers/message':input.message}}});
  return {success:result.success,worker:input.worker,deployment:result.result,rollbackVersion:input.previousVersionId,hashVerification:input.verification,financialChanges:false};
}
