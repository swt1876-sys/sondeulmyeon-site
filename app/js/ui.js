/* =========================================================
   ui.js — 화면을 만들 때 자주 쓰는 "공구함"
   글자 안전 처리, 금액 표시, 아이콘, 알림 같은 작은 도구들입니다.
   ========================================================= */

var UI = (function () {
  /* 사용자가 입력한 글자를 화면에 그대로 넣으면 위험할 수 있어서(<script> 등)
     특수문자를 안전한 글자로 바꿔 주는 도구 */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 3000 → "3,000만 원" */
  function won(man) { return Number(man).toLocaleString('ko-KR') + '만 원'; }
  function manShort(man) { return Number(man).toLocaleString('ko-KR') + '만'; }

  /* "몇 분 전" 표시 */
  function ago(iso) {
    var diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return '방금';
    if (diff < 60) return Math.floor(diff) + '분 전';
    if (diff < 1440) return Math.floor(diff / 60) + '시간 전';
    return Math.floor(diff / 1440) + '일 전';
  }
  function hm(iso) {
    var d = new Date(iso);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  /* 은행 직원 표시 이름: "김민준 대리 · A은행 창원상남지점" */
  function bankerLabel(u) {
    if (!u) return '';
    return u.name + (u.title ? ' ' + u.title : '') + ' · ' + (u.banker ? u.banker.org + ' ' + u.banker.branch : '');
  }

  /* 사기 의심 단어 감지: 이런 단어가 보이면 대화창에 경고를 띄웁니다 */
  var RISK_WORDS = ['신분증', '비밀번호', '통장 사본', '통장사본', 'otp', '선입금', '보증금', '수수료 입금', '먼저 송금', '대포', '체크카드'];
  function riskWords(text) {
    var t = String(text).toLowerCase();
    return RISK_WORDS.filter(function (w) { return t.indexOf(w.toLowerCase()) !== -1; });
  }

  /* 선 아이콘(그림 글자) 모음 */
  var ICONS = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    warn: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    bank: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M9 21V10"/><path d="M15 21V10"/><path d="M2 10l10-6 10 6"/>',
    shield: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>'
  };
  function icon(name, size) {
    size = size || 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* 화면 아래에 잠깐 떴다 사라지는 알림 */
  var toastTimer = null;
  function toast(msg) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.remove(); }, 2200);
  }

  /* 폼 입력값을 한 번에 꺼내는 도구 */
  function formData(form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'file') out[el.name] = el.files && el.files[0] ? el.files[0].name : '';
      else out[el.name] = el.value.trim();
    });
    return out;
  }

  return { esc: esc, won: won, manShort: manShort, ago: ago, hm: hm, bankerLabel: bankerLabel,
           riskWords: riskWords, icon: icon, toast: toast, formData: formData };
})();
