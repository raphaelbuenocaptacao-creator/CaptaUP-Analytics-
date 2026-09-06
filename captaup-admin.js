(function(){
'use strict';
// O gerenciamento de acessos foi movido para adm-access.js e agora usa a AUREON Base.
// Este arquivo permanece como shim para não quebrar páginas/cache antigos que ainda o carregam.
function cleanupLegacyAdmin(){
  document.getElementById('admFab')?.remove();
  document.getElementById('admPanel')?.remove();
}
window.addEventListener('captaup-auth-changed',cleanupLegacyAdmin);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanupLegacyAdmin);else cleanupLegacyAdmin();
})();
