/* =========================================================
   native.js — 안드로이드 앱으로 실행될 때만 쓰는 작은 도구
   - 휴대폰의 "뒤로" 버튼: 앱 안에서 이전 화면으로 가고, 첫 화면이면 앱 종료
   웹 브라우저에서 열 때는 아무 일도 하지 않아요.
   ========================================================= */
(function () {
  var Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
  var AppPlugin = Cap.Plugins && Cap.Plugins.App;
  if (!AppPlugin) return;
  AppPlugin.addListener('backButton', function () {
    var hash = location.hash.replace(/^#\/?/, '');
    var home = hash === '' || hash === 'home' || hash === 'board';
    if (!home && history.length > 1) history.back();
    else AppPlugin.exitApp();
  });
})();
