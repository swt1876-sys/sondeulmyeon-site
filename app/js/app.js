/* =========================================================
   app.js — 앱의 "안내 데스크"
   1) 주소(#/home 같은 것)를 보고 어느 화면(방)을 보여줄지 정하고   → 라우터
   2) 버튼 클릭·폼 제출을 받아 창고(Store)에 일을 시키고            → 액션
   3) 바뀐 내용으로 화면을 다시 그립니다                              → render
   ========================================================= */

(function () {
  var root = document.getElementById('app');
  var state = { signupRole: 'borrower', bookingOpen: false, boardSido: '', boardSgg: '', boardOnlyNew: false,
                boardEmploy: '', boardSort: 'new', offersReq: '' };

  /* ---------- 지역 선택 칸 (시·도 → 시·군·구 → 읍·면·동) ----------
     화면 전체를 다시 그리면 다른 칸에 쓴 글자가 지워지므로, 지역 칸만 그 자리에서 바꿔 줍니다. */
  var Region = {
    $: function (id) { return document.getElementById(id); },
    fill: function (sel, placeholder, items) {
      sel.innerHTML = '';
      [''].concat(items).forEach(function (x, i) {
        var o = document.createElement('option'); o.value = x; o.textContent = i ? x : placeholder; sel.appendChild(o);
      });
    },
    onSido: function () {
      var sido = this.$('rg-sido').value, sgg = this.$('rg-sgg');
      var none = sido && Regions.noSgg(sido);
      this.$('rg-sgg-wrap').hidden = none;               // 세종처럼 시·군·구가 없으면 숨김
      this.fill(sgg, '시·군·구 선택', Regions.sggs(sido));
      sgg.disabled = !sido || none;
      this.onSgg();
    },
    onSgg: function () {
      var sido = this.$('rg-sido').value, sgg = this.$('rg-sgg').value;
      var ready = sido && (Regions.noSgg(sido) || sgg);
      var dongs = ready ? Regions.dongs(sido, sgg) : [];
      var dong = this.$('rg-dong'), typed = ready && !dongs.length;
      this.fill(dong, '읍·면·동 선택', dongs);
      dong.disabled = !dongs.length;
      this.$('rg-dong-wrap').hidden = typed;              // 목록이 없으면 직접 입력 칸으로
      this.$('rg-dong-text-wrap').hidden = !typed;
      this.$('rg-dong-text').value = '';
      this.$('rg-note').textContent = typed ? '시제품이라 이 지역은 읍·면·동 목록이 아직 없어요. 직접 입력해 주세요.'
        : (sido && Regions.noSgg(sido) ? '세종특별자치시는 시·군·구 없이 바로 읍·면·동을 골라요.' : '');
      this.show();
    },
    /* 지금 고른 값 { sido, sgg, dong } */
    value: function () {
      var sido = this.$('rg-sido').value;
      var sgg = sido && !Regions.noSgg(sido) ? this.$('rg-sgg').value : '';
      var dong = this.$('rg-dong-text-wrap').hidden ? this.$('rg-dong').value : this.$('rg-dong-text').value.trim();
      return { sido: sido, sgg: sgg, dong: dong };
    },
    show: function () {
      var v = this.value(), done = v.sido && (v.sgg || Regions.noSgg(v.sido)) && v.dong;
      this.$('rg-result').textContent = done ? '선택한 지역: ' + Regions.fullLabel(v) : '';
      if (this.$('rq-err')) this.$('rq-err').textContent = '';   // 이전 오류 문구 지우기
    }
  };

  /* ---------- 라우터: 주소 → 화면 ---------- */
  function route() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var parts = hash.split('/').filter(Boolean);   // "#/chat/t_1" → ["chat", "t_1"]
    var page = parts[0] || '', id = parts[1];
    var u = Store.me();

    if (Server.enabled()) {
      if (Server.error()) return Screens.setupError(Server.error());
      if (!Server.isReady()) return Screens.loading();
      if (!u) return Server.hasSession() ? Screens.signup(state) : Screens.emailLogin(state);
    }
    if (!u) return Screens.signup(state);

    var isB = u.role === 'banker';
    var verified = isB && u.banker.status === 'verified';

    // 인증 안 된 직원은 게시판·제안에 못 들어감 → 인증 화면으로
    if (isB && !verified && ['', 'board', 'propose', 'my-offers'].indexOf(page) !== -1) return Screens.verify();

    switch (page) {
      case '': return isB ? Screens.board(state) : Screens.home();
      case 'home': return isB ? Screens.board(state) : Screens.home();
      case 'request':
        if (isB) return Screens.notFound();
        if (id === 'new') return Screens.newRequest();
        var r = Store.request(id);
        return r && r.userId === u.id ? Screens.requestDetail(id) : Screens.notFound();
      case 'offers': return isB ? Screens.notFound() : Screens.offersBoard(state);
      case 'threads': return Screens.threads();
      case 'chat':
        var t = Store.thread(id);
        return t && (t.borrowerId === u.id || t.bankerId === u.id) ? Screens.chat(id, state) : Screens.notFound();
      case 'board': return isB ? Screens.board(state) : Screens.notFound();
      case 'propose': return isB ? Screens.propose(id) : Screens.notFound();
      case 'my-offers': return isB ? Screens.myOffers() : Screens.notFound();
      case 'verify': return isB ? (verified ? Screens.board(state) : Screens.verify()) : Screens.notFound();
      case 'me': return Screens.me();
      case 'report': return Screens.report(id, parts[2]);
      case 'admin': return Store.isAdmin() ? Screens.admin(state) : Screens.notFound();
      default: return Screens.notFound();
    }
  }

  /* 운영자에게만: 심사 대기가 있으면 화면 맨 위에 알림 띠 */
  function adminBar() {
    if (!Store.isAdmin() || /^#\/admin/.test(location.hash)) return '';
    var n = Screens.adminPending(), nr = Screens.openReports();
    if (!n && !nr) return '';
    return '<div class="demo-bar" role="status"><span>운영자 · ' +
      (n ? '재직 인증 대기 <b>' + n + '건</b>' : '') + (n && nr ? ' · ' : '') + (nr ? '신고 <b>' + nr + '건</b>' : '') + '</span>' +
      '<button data-act="admin-go" data-val="' + (n ? 'verif' : 'reports') + '">' + (n ? '심사하기' : '확인하기') + '</button></div>';
  }

  /* 시연용 상단 띠: 한 기기에서 여러 계정을 바꿔 가며 체험 */
  function demoBar() {
    var u = Store.me();
    var opts = Store.demoAccounts().map(function (a) {
      var label = a.role === 'banker' ? '직원 · ' + a.name + (a.banker && a.banker.org ? ' (' + a.banker.org + ')' : '') : '수요자 · ' + a.name;
      return '<option value="' + a.id + '"' + (u && u.id === a.id ? ' selected' : '') + '>' + UI.esc(label) + '</option>';
    }).join('');
    return '<div class="demo-bar"><span>시연 모드</span>' +
      '<label for="demo-user" class="sr">계정 전환</label>' +
      '<select id="demo-user" data-change="switch-user">' + (u ? '' : '<option value="">(가입 전)</option>') + opts + '<option value="__new">+ 새로 가입</option></select>' +
      '<button data-act="reset">데이터 초기화</button></div>';
  }

  function render() {
    // 대화 입력칸에 쓰던 글은 화면을 새로 그려도 남겨 둠
    var msg = document.getElementById('msg'), typed = msg ? msg.value : '', focused = msg && document.activeElement === msg;
    root.innerHTML = (Server.enabled() ? adminBar() : demoBar()) + route();
    // 운영자 화면이면 증빙 파일의 임시 주소를 받아 와서 다시 그림 (이미 받은 건 다시 안 받음)
    if (/^#\/admin/.test(location.hash) && Store.isAdmin()) {
      Server.loadDocUrls(Store.verifications().map(function (v) { return v.filePath; }), render);
    }
    var chatEl = document.getElementById('chat-scroll');
    if (chatEl) window.scrollTo(0, document.body.scrollHeight);
    msg = document.getElementById('msg');
    if (msg && typed) msg.value = typed;
    if (msg && focused) msg.focus();
  }

  /* 서버에서 새 소식이 오면 화면을 새로 그림.
     단, 무언가 입력하는 중인 화면(가입·조건 올리기·제안·인증·예약)에 이미 쓴 내용이 있으면
     지워지지 않도록 그리지 않고 기다림 (대화 입력칸은 render()가 따로 지켜 줌) */
  function typingInForm() {
    var fields = root.querySelectorAll('form[data-form]:not([data-form="message"]) input, form[data-form]:not([data-form="message"]) textarea, form[data-form]:not([data-form="message"]) select');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === 'checkbox' || f.type === 'radio') { if (f.checked !== f.defaultChecked) return true; }
      else if (f.tagName === 'SELECT') {
        for (var j = 0; j < f.options.length; j++) if (f.options[j].selected !== f.options[j].defaultSelected) return true;
      }
      else if (f.type === 'file') { if (f.files && f.files.length) return true; }
      else if (f.value !== f.defaultValue) return true;
      if (document.activeElement === f) return true;
    }
    return false;
  }
  Server.onChange(function (background) {
    if (background && (typingInForm() || state.bookingOpen)) return;
    render();
  });

  function go(to) {
    state.bookingOpen = false;
    if (location.hash === to) render(); else location.hash = to;
    window.scrollTo(0, 0);
  }

  function showError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
    return false;
  }
  function rememberEmail(v) { try { localStorage.setItem('sondeul-last-email', v); } catch (x) { /* 저장 불가해도 괜찮음 */ } }
  function posInt(v) { var n = Number(String(v).replace(/,/g, '')); return Number.isInteger(n) && n > 0 ? n : null; }

  /* ---------- 액션: 버튼을 누르면 할 일 ---------- */
  var Actions = {
    go: function (el) { go(el.dataset.to); },
    'pick-role': function (el) {
      // 입력한 값이 지워지지 않도록 화면 전체를 다시 그리지 않고 카드 모양만 바꿈
      state.signupRole = el.dataset.role;
      document.querySelectorAll('[data-act="pick-role"]').forEach(function (b) {
        var on = b.dataset.role === state.signupRole;
        b.classList.toggle('pick', on); b.setAttribute('aria-pressed', on);
      });
    },
    'check-all': function (el) {
      document.querySelectorAll('.agree').forEach(function (c) { c.checked = el.checked; });
    },
    'pick-chip': function (el) {
      var form = el.closest('form');
      form.elements[el.dataset.field].value = el.dataset.val;
      el.parentNode.querySelectorAll('.chip').forEach(function (c) {
        var on = c === el; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on);
      });
    },
    'start-chat': function (el) {
      var t = Store.openThread(el.dataset.offer);
      go('#/chat/' + t.id);
    },
    'close-request': function (el) {
      if (!confirm('이 조건을 마감할까요? 더 이상 새 제안을 받지 않아요.')) return;
      Store.closeRequest(el.dataset.id); UI.toast('마감했어요'); render();
    },
    'toggle-booking': function () { state.bookingOpen = !state.bookingOpen; render(); },
    booking: function (el) {
      Store.setBookingStatus(el.dataset.id, el.dataset.status);
      UI.toast(el.dataset.status === 'confirmed' ? '예약이 확정됐어요. 지점에서 만나요!' : '다른 시간을 요청했어요');
      render();
    },
    'board-employ': function (el) { state.boardEmploy = el.dataset.val; render(); },
    'send-precheck': function (el) {
      var me = Store.me();
      Store.sendPrecheck(el.dataset.thread, me.id, { bank: me.banker.org, product: '대출 사전 한도 조회' });
      UI.toast('사전조회 안내를 보냈어요'); render();
    },
    'open-bank': function () { UI.toast('실제 서비스에서는 여기서 은행 공식 앱이 열려요 (시제품)'); },
    'precheck-done': function (el) {
      var t = Store.thread(location.hash.split('/')[2]);
      Store.setPrecheckDone(el.dataset.id);
      if (t) Store.sendText(t.id, Store.me().id, '은행 앱에서 사전조회 했어요. 확인 부탁드려요.');
      render();
    },
    approve: function () {
      if (Server.enabled()) return;   // 서버 모드에서는 운영자만 승인
      Store.approveVerification(Store.me().id); UI.toast('재직 인증이 완료됐어요'); go('#/board');
    },
    logout: function () {
      if (Server.enabled()) { Server.signOut(); state.otpEmail = ''; location.hash = '#/'; return; }
      Store.logout(); go('#/');
    },
    'delete-account': function () {
      if (!confirm('정말 탈퇴할까요? 내가 올린 조건·제안·대화가 모두 지워지고 되돌릴 수 없어요.')) return;
      if (Server.enabled()) {
        Server.deleteAccount().then(function () { UI.toast('탈퇴가 완료됐어요'); state.otpEmail = ''; location.hash = '#/'; })
          .catch(function () { UI.toast('탈퇴하지 못했어요. 잠시 후 다시 시도해 주세요.'); });
        return;
      }
      Store.deleteMe(); UI.toast('탈퇴가 완료됐어요'); go('#/');
    },
    'admin-tab': function (el) { state.adminTab = el.dataset.val; render(); },
    'admin-view': function (el) { state.adminView = el.dataset.val; render(); },
    'admin-go': function (el) { state.adminView = el.dataset.val; go('#/admin'); },
    'report-tab': function (el) { state.reportTab = el.dataset.val; render(); },
    'post-tab': function (el) { state.postTab = el.dataset.val; render(); },
    'admin-delete-request': function (el) {
      if (!confirm('이 조건 글을 삭제할까요? 이 글에 온 제안과 대화도 모두 지워지고 되돌릴 수 없어요.')) return;
      Store.deleteRequest(el.dataset.id); UI.toast('조건 글을 삭제했어요'); render();
    },
    'admin-delete-offer': function (el) {
      if (!confirm('이 제안을 삭제할까요? 이 제안으로 열린 대화도 함께 지워지고 되돌릴 수 없어요.')) return;
      Store.deleteOffer(el.dataset.id); UI.toast('제안을 삭제했어요'); render();
    },
    block: function (el) {
      if (!confirm('이 사용자를 차단할까요? 서로의 조건·제안이 보이지 않고 대화를 주고받을 수 없어요. (내 정보에서 언제든 풀 수 있어요)')) return;
      Store.block(el.dataset.user); UI.toast('차단했어요'); render();
    },
    unblock: function (el) { Store.unblock(el.dataset.user); UI.toast('차단을 풀었어요'); render(); },
    'admin-resolve': function (el) {
      var note = prompt('처리 메모를 남겨 주세요. (운영자만 봐요)', '확인 후 조치 완료');
      if (note === null) return;
      Store.resolveReport(el.dataset.id, note.trim()); UI.toast('처리 완료로 바꿨어요'); render();
    },
    'admin-close-request': function (el) {
      if (!confirm('이 조건 글을 내릴까요? 게시판에서 사라지고 새 제안을 받지 않아요.')) return;
      Store.closeRequest(el.dataset.id); UI.toast('조건 글을 내렸어요'); render();
    },
    'admin-revoke': function (el) {
      var reason = prompt('재직 인증을 취소할까요? 취소 사유를 적어 주세요. (직원에게 보여요)', '이용 규칙 위반 신고가 확인되어 인증이 취소됐어요.');
      if (reason === null) return;
      Store.reviewVerification(el.dataset.id, 'rejected', reason.trim()); UI.toast('재직 인증을 취소했어요'); render();
    },
    'admin-approve': function (el) {
      var u = Store.user(el.dataset.id);
      if (!confirm((u ? u.name + ' 님의 ' : '') + '재직 인증을 승인할까요? 승인하면 바로 게시판을 볼 수 있어요.')) return;
      Store.reviewVerification(el.dataset.id, 'verified'); UI.toast('승인했어요'); render();
    },
    'admin-reject': function (el) {
      var reason = prompt('반려 사유를 적어 주세요. (직원에게 그대로 보여요)', '증빙 서류의 이름·소속이 잘 보이지 않아요.');
      if (reason === null) return;
      Store.reviewVerification(el.dataset.id, 'rejected', reason.trim()); UI.toast('반려했어요'); render();
    },
    'otp-reset': function () { state.otpEmail = ''; render(); },
    'pw-toggle': function () { state.pwLogin = !state.pwLogin; state.otpEmail = ''; render(); },
    reset: function () {
      if (!confirm('모든 데이터를 처음 상태로 되돌릴까요?')) return;
      Store.reset(); state.signupRole = 'borrower'; go('#/');
    }
  };

  /* ---------- 폼 제출: 입력한 내용을 검사하고 창고에 저장 ---------- */
  var Forms = {
    /* 서버 모드: 이메일로 인증번호 받기 → 입력 */
    'otp-send': function (form) {
      var d = UI.formData(form);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || '')) return showError('otp-err', '이메일 주소를 확인해 주세요.');
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      Server.sendCode(d.email.trim()).then(function () {
        state.otpEmail = d.email.trim(); render(); UI.toast('인증번호를 보냈어요');
      }).catch(function (err) {
        btn.disabled = false;
        showError('otp-err', /rate|seconds/i.test(String(err && err.message)) ? '잠시 후 다시 시도해 주세요. (너무 자주 요청했어요)' : '인증번호를 보내지 못했어요. 이메일을 확인해 주세요.');
      });
    },
    'pw-login': function (form) {
      var d = UI.formData(form);
      if (!d.email || !d.password) return showError('otp-err', '이메일과 비밀번호를 입력해 주세요.');
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      Server.signInPassword(d.email.trim(), d.password).then(function () {
        rememberEmail(d.email.trim());
        state.pwLogin = false; UI.toast('로그인했어요');
      }).catch(function () { btn.disabled = false; showError('otp-err', '이메일 또는 비밀번호가 맞지 않아요.'); });
    },
    'otp-verify': function (form) {
      var d = UI.formData(form);
      d.code = String(d.code || '').replace(/\s/g, '');
      if (!/^\d{6,10}$/.test(d.code)) return showError('otp-err', '메일로 받은 숫자를 그대로 입력해 주세요.');
      var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      Server.verifyCode(state.otpEmail, d.code).then(function () {
        rememberEmail(state.otpEmail);
        UI.toast('인증됐어요');   // 로그인 상태가 바뀌면 server.js가 내용을 불러와 화면을 다시 그려요
      }).catch(function () {
        btn.disabled = false; showError('otp-err', '번호가 맞지 않거나 시간이 지났어요. 다시 확인해 주세요.');
      });
    },
    signup: function (form) {
      var d = UI.formData(form);
      if (!d.name) return showError('su-err', '이름을 입력해 주세요.');
      if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(d.phone)) return showError('su-err', '휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)');
      if (!d.adult) return showError('su-err', '손들면은 만 19세 이상만 가입할 수 있어요.');
      if (!d.terms || !d.privacy || !d.contact) return showError('su-err', '필수 약관에 모두 동의해 주세요.');
      var u = Store.signup({ id: Server.enabled() ? Server.userId() : null, role: state.signupRole, name: d.name, phone: d.phone,
                             consents: { contact: d.contact, notify: d.notify } });
      UI.toast('가입을 환영해요!');
      go(u.role === 'banker' ? '#/verify' : '#/home');
    },
    request: function (form) {
      var d = UI.formData(form);
      var amount = posInt(d.amount), term = posInt(d.term);
      if (!amount) return showError('rq-err', '필요 금액을 숫자로 입력해 주세요. (만 원 단위, 예: 3000)');
      if (!term || term > 480) return showError('rq-err', '기간을 개월 수로 입력해 주세요. (예: 36)');
      if (term < 3) return showError('rq-err', '대출 기간은 3개월 이상으로 입력해 주세요.');
      if (!d.rate || !d.purpose) return showError('rq-err', '희망 금리와 자금 용도를 입력해 주세요.');
      if (!d.employ) return showError('rq-err', '고용 형태를 골라 주세요.');
      if (!d.income || !d.debt) return showError('rq-err', '연소득과 기존 대출 잔액을 골라 주세요.');
      if (!d.late) return showError('rq-err', '최근 1년 연체 이력을 골라 주세요. (직원 선택 후에만 공개돼요)');
      var place = Region.value();
      if (!place.sido) return showError('rq-err', '희망 지역의 시·도를 골라 주세요.');
      if (!Regions.noSgg(place.sido) && !place.sgg) return showError('rq-err', '희망 지역의 시·군·구를 골라 주세요.');
      if (!place.dong) return showError('rq-err', '희망 지역의 읍·면·동을 골라 주세요.');
      var r = Store.createRequest(Store.me().id, { amount: amount, term: term, repay: d.repay, rate: d.rate,
                                                   purpose: d.purpose, employ: d.employ, income: d.income, debt: d.debt, late: d.late,
                                                   sido: place.sido, sgg: place.sgg, dong: place.dong });
      UI.toast('조건을 게시했어요. 제안이 오면 알려드릴게요');
      go('#/request/' + r.id);
    },
    verify: function (form) {
      var d = UI.formData(form);
      if (!d.org || !d.branch || !d.title) return showError('vf-err', '소속 금융사, 지점, 직급을 입력해 주세요.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return showError('vf-err', '회사 이메일 형식을 확인해 주세요.');
      if (/@(gmail|naver|daum|hanmail|kakao|nate|hotmail|outlook|yahoo|icloud)\./i.test(d.email)) return showError('vf-err', '개인 메일이 아닌 회사 이메일을 입력해 주세요.');
      if (!d.file) return showError('vf-err', '재직 증빙 파일을 올려 주세요.');
      if (!d.policyOk) return showError('vf-err', '내부 규정 확인에 체크해 주세요.');
      var fileObj = form.elements.file && form.elements.file.files ? form.elements.file.files[0] : null;
      Store.submitVerification(Store.me().id, { org: d.org, branch: d.branch, title: d.title, email: d.email,
                                                fileName: d.file, file: fileObj, policyOk: d.policyOk });
      UI.toast('인증 신청이 접수됐어요'); render();
    },
    offer: function (form) {
      var d = UI.formData(form);
      var limit = posInt(d.limit), term = posInt(d.term);
      if (!d.product || !d.rate) return showError('of-err', '상품명과 예상 금리를 입력해 주세요.');
      if (!limit || !term) return showError('of-err', '한도와 기간을 숫자로 입력해 주세요.');
      if (term < 3 || term > 480) return showError('of-err', '기간은 3개월 이상 480개월 이하로 입력해 주세요.');
      if (!d.notice) return showError('of-err', '고지 사항 확인에 체크해 주세요.');
      Store.createOffer(Store.me().id, form.dataset.req, { product: d.product, rate: d.rate, limit: limit, term: term, alt: d.alt, memo: d.memo });
      UI.toast('제안을 보냈어요'); go('#/my-offers');
    },
    message: function (form) {
      var d = UI.formData(form);
      if (!d.text) return;
      Store.sendText(form.dataset.thread, Store.me().id, d.text);
      if (UI.riskWords(d.text).length) UI.toast('주의: 돈·비밀번호·신분증 관련 요청은 사기일 수 있어요');
      render();
      var input = document.getElementById('msg'); if (input) input.focus();
    },
    report: function (form) {
      var d = UI.formData(form), kind = form.dataset.kind, id = form.dataset.id;
      if (!d.reason) return showError('rp-err', '신고 사유를 골라 주세요.');
      var x = Screens.reportTarget(kind, id);
      if (!x) return;
      Store.report({ kind: kind, refId: id, targetId: x.targetId, reason: d.reason, detail: (d.detail || '').trim(), snapshot: x.snapshot });
      if (d.block && x.targetId) Store.block(x.targetId);
      UI.toast(d.block ? '신고하고 차단했어요. 운영자가 확인할게요' : '신고가 접수됐어요. 운영자가 확인할게요');
      go(kind === 'thread' ? x.back : (Store.me().role === 'banker' ? '#/board' : '#/offers'));
    },
    booking: function (form) {
      var d = UI.formData(form);
      if (!d.date || !d.time || !d.place) { UI.toast('날짜, 시간, 장소를 모두 입력해 주세요'); return; }
      var dt = new Date(d.date + 'T' + d.time);
      var label = (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일(' + '일월화수목금토'[dt.getDay()] + ')';
      Store.sendBooking(form.dataset.thread, Store.me().id, { date: label, time: d.time, place: d.place });
      state.bookingOpen = false; UI.toast('예약 요청을 보냈어요'); render();
    }
  };

  /* ---------- 이벤트 연결: 화면 어디서 누르든 여기서 받아 처리 ---------- */
  root.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    if (el.dataset.act === 'check-all') { Actions['check-all'](el); return; }  // 체크박스 기본 동작 유지
    ev.preventDefault();
    var fn = Actions[el.dataset.act];
    if (fn) fn(el);
  });
  root.addEventListener('submit', function (ev) {
    var form = ev.target.closest('[data-form]');
    if (!form) return;
    ev.preventDefault();
    Forms[form.dataset.form](form);
  });
  root.addEventListener('change', function (ev) {
    var el = ev.target, kind = el.dataset.change;
    if (kind === 'switch-user') {
      if (el.value === '__new') { Store.logout(); go('#/'); }
      else if (el.value) { Store.login(el.value); go('#/'); }
    } else if (kind === 'board-sido') { state.boardSido = el.value; state.boardSgg = ''; render(); }
    else if (kind === 'board-sgg') { state.boardSgg = el.value; render(); }
    else if (kind === 'board-sort') { state.boardSort = el.value; render(); }
    else if (kind === 'offers-req') { state.offersReq = el.value; render(); }
    else if (kind === 'board-only-new') { state.boardOnlyNew = el.checked; render(); }
    else if (kind === 'rg-sido') Region.onSido();
    else if (kind === 'rg-sgg') Region.onSgg();
    else if (kind === 'rg-dong') Region.show();
  });
  root.addEventListener('input', function (ev) {
    if (ev.target.dataset.input === 'rg-dong-text') Region.show();
  });
  window.addEventListener('hashchange', render);

  render();
})();
