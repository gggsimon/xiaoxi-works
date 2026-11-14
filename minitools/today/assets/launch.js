(function(){
  window.__xhsToolName = "\u4eca\u65e5\u7384\u673a";
  if(!location.hash){
    try{ history.replaceState(null,'',(location.pathname+location.search)+'#/tool/today'); }
    catch(e){ location.hash='#/tool/today'; }
  }
})();
