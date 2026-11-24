const originalRequestFailure=window.OnRequestFail;window.OnRequestFail=function(...args){if(window.JetXNative.requiresLogin)return;return originalRequestFailure(...args);};
