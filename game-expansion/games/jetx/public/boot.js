let controllerName='JetXapi';let baseUrl=location.origin+'/native-library/jetx/r1/';let externalUrl='';
window.hub=$.connection.h;window.token='local';$.connection.hub.start().done(()=>{hubGetList();timerPing();});
window.addEventListener('offline',()=>window.jetX?.showInternetLost());window.addEventListener('online',()=>window.JetXNative?.refresh());
