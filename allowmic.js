document.addEventListener('permissionrequest', function(e) {
  if ( e.permission === 'media' ) {
      console.log("allow media");
      e.request.allow();
  }
});