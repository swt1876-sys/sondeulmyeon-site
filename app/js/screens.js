/* =========================================================
   screens.js — 앱의 "방(화면)"들
   각 함수가 화면 하나를 그립니다. 화면 = HTML 글자 덩어리.
   버튼에 붙은 data-act="..." 는 "이 버튼을 누르면 Actions 의 무엇을 할지" 표시입니다.
   ========================================================= */

var Screens = (function () {
  var e = UI.esc, I = UI.icon;

  /* ---------- 공통 조각 ---------- */
  /* 서비스 이름과 대표 문구 (첫 화면 맨 위) */
  function brand() {
    return '<div class="brand">' +
      '<span class="brand-name"><img src="assets/logo/symbol-white.svg" alt="" width="30" height="30">손들면</span>' +
      '<span class="brand-line">대출, 이제 은행이 먼저 찾아옵니다.</span>' +
      // 넓은 화면(컴퓨터)에서만 보이는 소개 (휴대폰에서는 숨김)
      '<div class="brand-more">' +
        '<p class="brand-big">원하는 대출 조건만 올리세요.<br>은행 직원이 <b>먼저</b> 제안해 드려요.</p>' +
        '<ol class="brand-steps">' +
          '<li><b>조건 올리기</b><span>금액·기간·지역만. 이름 없이 게시돼요.</span></li>' +
          '<li><b>제안 받기</b><span>재직 인증된 직원의 제안이 도착 순서대로 와요.</span></li>' +
          '<li><b>지점에서 상담</b><span>고른 직원과 대화하고 지점을 방문해요.</span></li>' +
        '</ol>' +
        '<p class="brand-safe">연락처는 내가 고른 직원에게만 · 서류·선입금 요구 없음 · 이용료 무료</p>' +
      '</div></div>';
  }

  function head(opts) {
    return '<header class="head' + (opts.navy ? ' navy' : '') + '">' +
      '<div class="head-row">' +
        (opts.back ? '<button class="back" data-act="go" data-to="' + opts.back + '" aria-label="뒤로">' + I('back', 22) + '</button>' : '') +
        '<div style="display:flex;flex-direction:column;gap:6px;flex:1">' +
          (opts.kicker ? '<div class="kicker">' + opts.kicker + '</div>' : '') +
          '<h1>' + opts.title.replace(/<br>/g, '<br class="mbr"> ') + '</h1>' +
          (opts.sub ? '<p class="sub">' + opts.sub + '</p>' : '') +
        '</div>' +
      '</div></header>';
  }

  /* deskOnly=true: 휴대폰에서는 숨기고 컴퓨터 화면의 위쪽 메뉴로만 보여 줌 (입력·대화 화면용) */
  function tabs(active, deskOnly) {
    var u = Store.me();
    var items = u.role === 'banker'
      ? [['board', '수요자 게시판', 'list'], ['my-offers', '보낸 제안', 'send'], ['threads', '대화', 'chat'], ['me', '내 정보', 'user']]
      : [['home', '내 요청', 'home'], ['offers', '제안 게시판', 'list'], ['threads', '대화', 'chat'], ['me', '내 정보', 'user']];
    return '<nav class="tabs' + (deskOnly ? ' desk-only' : '') + '" aria-label="주요 메뉴">' +
      '<button class="tabs-brand" data-act="go" data-to="#/" aria-label="손들면 처음으로"><img src="assets/logo/symbol-navy.svg" alt="" width="26" height="26">손들면</button>' +
      items.map(function (t) {
      return '<button data-act="go" data-to="#/' + t[0] + '" class="' + (active === t[0] ? 'on' : '') + '"' +
        (active === t[0] ? ' aria-current="page"' : '') + '>' + I(t[2], 22) + t[1] + '</button>';
    }).join('') + '</nav>';
  }

  /* full=true 이면 읍·면·동까지, 아니면 게시판 공개 범위(시·도 + 시·군·구)까지만 */
  function requestTags(r, full) {
    var place = full ? Regions.fullLabel(r) : Regions.publicLabel(r);
    return '<div class="tags">' +
      (place ? '<span class="tag">' + e(place) + '</span>' : '') +
      '<span class="tag">' + e(r.repay) + '</span>' +
      '<span class="tag">' + e(r.rate) + '</span>' +
      '</div>' + summaryTags(r, full);
  }

  /* 심사 참고 정보: 게시판에는 고용 형태·연소득·기존 대출만, 연체 이력은 full(본인·선택된 직원)일 때만 */
  function summaryTags(r, full) {
    if (!r.employ) return '';
    return '<div class="tags">' +
      '<span class="tag blue">' + e(r.employ) + '</span>' +
      '<span class="tag blue">연소득 ' + e(r.income) + '</span>' +
      '<span class="tag blue">기존대출 ' + e(r.debt) + '</span>' +
      (full && r.late ? '<span class="tag blue">연체 이력 ' + e(r.late) + '</span>' : '') +
      '</div>';
  }

  /* 칩(버튼) 여러 개 중 하나 고르기. 고른 값은 숨은 칸 name 에 들어감 */
  function chipGroup(name, items, labelId, selected) {
    return '<input type="hidden" name="' + name + '" value="' + e(selected || '') + '">' +
      '<div class="chips" role="group" aria-labelledby="' + labelId + '">' + items.map(function (x) {
        var on = x === selected;
        return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="pick-chip" data-field="' + name +
          '" data-val="' + e(x) + '" aria-pressed="' + on + '">' + e(x) + '</button>';
      }).join('') + '</div>';
  }

  /* 작은 "신고" 글자 버튼 */
  function reportLink(kind, id) {
    return '<button type="button" data-act="go" data-to="#/report/' + kind + '/' + id + '" aria-label="신고하기" ' +
      'style="background:none;border:0;color:var(--muted);font-size:12px;text-decoration:underline;cursor:pointer;padding:2px 4px">신고</button>';
  }

  var INCOME = ['2,000만 미만', '2,000만~3,000만', '3,000만~5,000만', '5,000만~7,000만', '7,000만~1억', '1억 이상'];
  var DEBT = ['없음', '1,000만 미만', '1,000만~3,000만', '3,000만~5,000만', '5,000만~1억', '1억 이상'];

  function screeningField() {
    return '<div class="card" style="border-color:#C9D3F0;gap:12px">' +
      '<div><div class="title" style="font-size:15px">심사 참고 정보 <span style="font-size:12px;font-weight:500;color:var(--accent)">서류 없이 직접 입력</span></div>' +
      '<div class="hint">세 가지만 골라 주세요. 직원이 더 정확한 예상 조건을 제안할 수 있어요.</div></div>' +
      '<div class="field"><span class="label" id="sc-employ-l">고용 형태</span>' + chipGroup('employ', ['직장인', '개인사업자', '프리랜서'], 'sc-employ-l') + '</div>' +
      '<div class="grid2">' +
        '<div class="field"><label for="sc-income">연소득 (세전, 원)</label><select class="input" id="sc-income" name="income" style="font-size:14px;padding:0 8px">' + options('선택', INCOME) + '</select></div>' +
        '<div class="field"><label for="sc-debt">기존 대출 잔액 (원)</label><select class="input" id="sc-debt" name="debt" style="font-size:14px;padding:0 8px">' + options('선택', DEBT) + '</select></div>' +
      '</div>' +
      '<div class="hint">↑ 이 세 가지는 게시판에 구간 그대로 보여요.</div>' +
      '<div class="field" style="padding:12px;border-radius:10px;background:var(--bg);border:1px dashed #C4CAD4">' +
        '<span class="label" id="sc-late-l" style="display:flex;gap:6px;align-items:center">' + I('lock', 14) + '최근 1년 연체 이력 <span class="meta">· 내가 고른 직원에게만 공개</span></span>' +
        chipGroup('late', ['없음', '있음', '잘 모름'], 'sc-late-l') +
      '</div>' +
      '<div class="box warn" style="font-size:12.5px">재직증명서·소득금액증명원 같은 <b>서류는 이 앱에 올리지 않아요.</b> 직원을 고른 뒤, 그 은행의 공식 앱에서 직접 제출하거나 조회해요.</div>' +
    '</div>';
  }

  function options(placeholder, items, selected) {
    return '<option value="">' + placeholder + '</option>' + items.map(function (x) {
      return '<option' + (x === selected ? ' selected' : '') + '>' + e(x) + '</option>';
    }).join('');
  }

  /* 지역 선택 칸: 시·도 → 시·군·구 → 읍·면·동 (동 목록이 없으면 직접 입력) */
  function regionField() {
    // 문을 연 시·도가 하나뿐이면 미리 골라 둠
    var only = Regions.sidos().length === 1 && !Regions.noSgg(Regions.sidos()[0]) ? Regions.sidos()[0] : '';
    return '<div class="field"><span class="label" id="rg-l">희망 지역 (방문할 지점 근처)</span>' +
      '<div role="group" aria-labelledby="rg-l" style="display:flex;flex-direction:column;gap:8px">' +
        '<label for="rg-sido" class="sr">시·도</label>' +
        '<select class="input" id="rg-sido" name="sido" data-change="rg-sido">' + options('시·도 선택', Regions.sidos(), only) + '</select>' +
        '<div id="rg-sgg-wrap"><label for="rg-sgg" class="sr">시·군·구</label>' +
          '<select class="input" id="rg-sgg" name="sgg" data-change="rg-sgg"' + (only ? '' : ' disabled') + '>' + options('시·군·구 선택', only ? Regions.sggs(only) : []) + '</select></div>' +
        '<div id="rg-dong-wrap"><label for="rg-dong" class="sr">읍·면·동</label>' +
          '<select class="input" id="rg-dong" name="dong" data-change="rg-dong" disabled>' + options('읍·면·동 선택', []) + '</select></div>' +
        '<div id="rg-dong-text-wrap" hidden><label for="rg-dong-text" class="sr">읍·면·동 직접 입력</label>' +
          '<input class="input" id="rg-dong-text" name="dongText" data-input="rg-dong-text" placeholder="읍·면·동 직접 입력 (예: 상남동)"></div>' +
      '</div>' +
      '<div class="hint" id="rg-note" aria-live="polite"></div>' +
      '<div id="rg-result" style="font-size:14px;font-weight:700;color:var(--accent-ink)"></div>' +
      (Regions.isNationwide() ? '' : '<div class="hint" style="color:var(--accent-ink);font-weight:700">지금은 ' + e(Regions.areaName()) + '에서 먼저 시작해요. 다른 지역은 차례로 열 예정이에요.</div>') +
      '<div class="hint">게시판에는 시·군·구까지만 보이고, 읍·면·동은 내가 고른 직원에게만 공개돼요.</div>' +
    '</div>';
  }

  /* ---------- 1. 첫 화면 / 회원가입 ---------- */
  function signup(state) {
    var role = state.signupRole || 'borrower';
    function roleCard(val, iconName, t, d) {
      var on = role === val;
      return '<button type="button" class="card' + (on ? ' pick' : '') + '" data-act="pick-role" data-role="' + val + '" ' +
        'aria-pressed="' + on + '" style="flex-direction:row;align-items:center;gap:14px;text-align:left;cursor:pointer">' +
        '<span style="width:44px;height:44px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;flex:none;color:' +
        (val === 'banker' ? 'var(--navy)' : 'var(--accent)') + '">' + I(iconName, 22) + '</span>' +
        '<span style="display:flex;flex-direction:column;gap:2px"><span class="title">' + t + '</span><span class="meta" style="font-size:13px;color:var(--ink-2)">' + d + '</span></span>' +
        '</button>';
    }
    return '<div class="phone auth">' +
      brand() + head({ kicker: '회원가입', title: '어떤 목적으로<br>이용하시나요?', sub: '조건을 올리면 여러 금융사 직원이 맞는 상품을 제안해요.' }) +
      '<form class="body" data-form="signup" novalidate>' +
        roleCard('borrower', 'user', '대출이 필요해요', '조건을 올리고 직원의 제안을 받아요') +
        roleCard('banker', 'bank', '금융사 직원이에요', '재직 인증 후 수요를 보고 상품을 제안해요') +
        '<div class="field"><label for="su-name">이름</label><input class="input" id="su-name" name="name" autocomplete="name" placeholder="홍길동"></div>' +
        '<div class="field"><label for="su-phone">휴대폰 번호</label><input class="input" id="su-phone" name="phone" inputmode="tel" placeholder="010-0000-0000">' +
          '<div class="hint">' + (Server.enabled() ? '내가 고른 상대에게만 공개돼요.' : '실제 서비스에서는 여기서 휴대폰 본인인증을 해요. (시제품은 생략)') + '</div></div>' +
        (Server.enabled() ? '<div class="box white" style="font-size:13px">인증된 이메일: <b>' + e(Server.email()) + '</b></div>' : '') +
        '<div class="card" style="gap:10px">' +
          '<label class="check" style="font-weight:700;color:var(--ink)"><input type="checkbox" data-act="check-all">전체 동의</label>' +
          '<label class="check"><input type="checkbox" name="adult" class="agree">(필수) 만 19세 이상입니다</label>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><label class="check"><input type="checkbox" name="terms" class="agree">(필수) 서비스 이용약관</label>' +
            '<a href="https://sondeulmyeon.kr/terms.html" target="_blank" rel="noopener" style="font-size:13px;flex:none">보기</a></div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><label class="check"><input type="checkbox" name="privacy" class="agree">(필수) 개인정보 수집·이용 (국외 이전 포함)</label>' +
            '<a href="https://sondeulmyeon.kr/privacy.html" target="_blank" rel="noopener" style="font-size:13px;flex:none">보기</a></div>' +
          '<label class="check"><input type="checkbox" name="contact" class="agree">(필수) 내가 선택한 상대에게만 연락처 제공</label>' +
          '<label class="check"><input type="checkbox" name="notify" class="agree">(선택) 새 제안 알림 받기</label>' +
        '</div>' +
        '<div class="error" id="su-err" role="alert"></div>' +
        '<button class="btn" type="submit">가입하고 시작하기</button>' +
        '<p class="notice">손들면은 대출을 취급하지 않으며, 계약은 해당 금융사 지점에서 체결됩니다.</p>' +
      '</form></div>';
  }

  /* ---------- 1-0. 서버 모드: 이메일로 시작하기 (6자리 인증번호) ---------- */
  function emailLogin(state) {
    var sent = !!state.otpEmail;
    // 스토어 심사용: 운영자가 만든 심사 계정만 비밀번호로 로그인 (일반 이용자는 쓰지 않음)
    if (state.pwLogin) {
      return '<div class="phone auth">' + brand() + head({ kicker: '심사용 로그인', title: '심사 계정으로<br>로그인', sub: '앱 심사를 위해 운영자가 발급한 계정 전용이에요.' }) +
        '<form class="body" data-form="pw-login" novalidate>' +
          '<div class="field"><label for="pw-mail">이메일</label><input class="input" id="pw-mail" name="email" type="email" autocomplete="username"></div>' +
          '<div class="field"><label for="pw-pass">비밀번호</label><input class="input" id="pw-pass" name="password" type="password" autocomplete="current-password"></div>' +
          '<div class="error" id="otp-err" role="alert"></div>' +
          '<button class="btn" type="submit">로그인</button>' +
          '<button class="btn plain" type="button" data-act="pw-toggle">이메일 인증번호로 시작하기</button>' +
        '</form></div>';
    }
    return '<div class="phone auth">' +
      brand() + head({ kicker: '시작하기', title: sent ? '인증번호를<br>입력해 주세요' : '이메일로<br>시작하기',
                       sub: sent ? e(state.otpEmail) + '(으)로 인증번호를 보냈어요.' : '처음이면 가입, 이미 가입했다면 로그인돼요.' }) +
      (sent
        ? '<form class="body" data-form="otp-verify" novalidate>' +
            '<div class="field"><label for="otp-code">인증번호</label>' +
              '<input class="input" id="otp-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="메일로 받은 숫자"></div>' +
            '<div class="error" id="otp-err" role="alert"></div>' +
            '<button class="btn" type="submit">확인</button>' +
            '<button class="btn plain" type="button" data-act="otp-reset">이메일 다시 입력하기</button>' +
            '<div class="hint">메일이 안 보이면 스팸함도 확인해 주세요.</div>' +
          '</form>'
        : '<form class="body" data-form="otp-send" novalidate>' +
            '<div class="field"><label for="otp-mail">이메일</label>' +
              '<input class="input" id="otp-mail" name="email" type="email" autocomplete="email" placeholder="name@example.com"></div>' +
            '<div class="hint">금융사 직원은 <b>회사 이메일</b>로 시작하면 재직 인증이 빨라요.</div>' +
            '<div class="error" id="otp-err" role="alert"></div>' +
            '<button class="btn" type="submit">인증번호 받기</button>' +
            '<button type="button" data-act="pw-toggle" style="background:none;border:0;color:var(--ink-3, #6A7184);font-size:12px;text-decoration:underline;cursor:pointer;align-self:center">심사용 계정 로그인</button>' +
          '</form>') +
      '<p class="notice" style="padding:0 20px 24px">손들면은 대출을 취급하지 않으며, 계약은 해당 금융사 지점에서 체결됩니다.</p>' +
      '</div>';
  }

  /* 서버 설정(config.js)에 문제가 있을 때 */
  function setupError(msg) {
    return '<div class="phone">' + brand() + head({ kicker: '설정 확인', title: '서버 설정을<br>확인해 주세요' }) +
      '<main class="body"><div class="box warn" role="alert" style="line-height:1.6">' + e(msg) + '</div>' +
      '<div class="hint">VS Code에서 js/config.js를 열어 고치고 저장(Ctrl+S)한 뒤, 이 화면을 새로고침(F5) 해 주세요.</div></main></div>';
  }

  /* 서버에서 불러오는 중 */
  function loading() {
    return '<div class="phone">' + brand() + '<main class="body"><div class="empty">불러오는 중이에요…</div></main></div>';
  }

  /* ---------- 2. 수요자: 내 요청 목록 ---------- */
  function home() {
    var u = Store.me(), list = Store.myRequests(u.id);
    var cards = list.length ? list.map(function (r) {
      var n = Store.offersFor(r.id).length;
      return '<button class="card" data-act="go" data-to="#/request/' + r.id + '" style="text-align:left;cursor:pointer">' +
        '<div class="card-top"><span class="meta">' + UI.ago(r.createdAt) + ' 게시</span>' +
        (r.status === 'closed' ? '<span class="badge gray">마감</span>' : '<span class="badge ' + (n ? 'good' : 'warn') + '">제안 ' + n + '건</span>') + '</div>' +
        '<div class="title">' + e(r.purpose) + ' ' + UI.won(r.amount) + ' · ' + r.term + '개월</div>' +
        requestTags(r) + '</button>';
    }).join('') : '<div class="empty">아직 올린 조건이 없어요.<br>원하는 대출 조건을 올려 보세요.</div>';
    return '<div class="phone">' +
      head({ kicker: '대출 수요자', title: e(u.name) + '님, 안녕하세요', sub: '올린 조건과 받은 제안을 확인하세요.' }) +
      '<main class="body">' +
        '<button class="btn" data-act="go" data-to="#/request/new" style="display:flex;align-items:center;justify-content:center;gap:6px">' + I('plus', 20) + '새 조건 올리기</button>' +
        cards +
      '</main>' + tabs('home') + '</div>';
  }

  /* ---------- 3. 수요자: 조건 등록 ---------- */
  function newRequest() {
    var repays = ['원리금균등', '원금균등', '만기일시'];
    return '<div class="phone narrow">' +
      head({ back: '#/home', kicker: '조건 등록', title: '원하는 대출 조건을<br>알려주세요' }) +
      '<form class="body" data-form="request" novalidate>' +
        '<div class="grid2">' +
          '<div class="field"><label for="rq-amt">필요 금액 (만 원)</label><input class="input" id="rq-amt" name="amount" inputmode="numeric" placeholder="3000"></div>' +
          '<div class="field"><label for="rq-term">기간 (개월, 3 이상)</label><input class="input" id="rq-term" name="term" inputmode="numeric" placeholder="36"></div>' +
        '</div>' +
        '<div class="field"><span class="label" id="rq-repay-l">상환 방식</span>' +
          '<input type="hidden" name="repay" value="원리금균등">' +
          '<div class="chips" role="group" aria-labelledby="rq-repay-l">' + repays.map(function (x, i) {
            return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-act="pick-chip" data-field="repay" data-val="' + x + '" aria-pressed="' + (i === 0) + '">' + x + '</button>';
          }).join('') + '</div></div>' +
        '<div class="field"><label for="rq-rate">희망 금리</label><input class="input" id="rq-rate" name="rate" placeholder="예: 연 6% 이하"></div>' +
        '<div class="field"><label for="rq-purpose">자금 용도</label><input class="input" id="rq-purpose" name="purpose" placeholder="예: 사업 운영자금"></div>' +
        regionField() +
        screeningField() +
        '<div class="box white" style="display:flex;gap:10px;align-items:flex-start">' + I('lock', 18) +
          '<span>이름과 연락처는 내가 직원을 선택하기 전까지 공개되지 않아요.</span></div>' +
        '<div class="error" id="rq-err" role="alert"></div>' +
        '<button class="btn" type="submit">조건 게시하기</button>' +
      '</form>' + tabs('home', true) + '</div>';
  }

  /* ---------- 4. 수요자: 받은 제안 ---------- */
  function requestDetail(id) {
    var r = Store.request(id);
    if (!r) return notFound();
    var offers = Store.offersFor(r.id);
    var cards = offers.length ? offers.map(function (o, i) {
      var b = Store.user(o.bankerId);
      return '<article class="card">' +
        '<div class="card-top"><div><div class="title" style="font-size:15px">' + e(b.banker.org + ' ' + b.banker.branch) + '</div>' +
        '<div class="meta">' + e(b.name + ' ' + (b.title || '')) + ' · ' + UI.ago(o.createdAt) + ' 도착</div></div>' +
        '<span style="display:flex;align-items:center;gap:4px"><span class="badge good">재직 인증</span>' + reportLink('offer', o.id) + '</span></div>' +
        '<div class="meta" style="font-weight:500;color:var(--ink-2)">' + e(o.product) + '</div>' +
        '<div class="grid3">' +
          '<div class="stat"><span class="k">예상 금리</span><span class="v blue">' + e(o.rate) + '</span></div>' +
          '<div class="stat"><span class="k">한도</span><span class="v">' + UI.manShort(o.limit) + '</span></div>' +
          '<div class="stat"><span class="k">기간</span><span class="v">' + o.term + '개월</span></div>' +
        '</div>' +
        (o.alt ? '<div class="box warn">대안 제시: ' + e(o.alt) + '</div>' : '') +
        (o.memo ? '<div style="font-size:13px;color:var(--ink-2);line-height:1.5">' + e(o.memo) + '</div>' : '') +
        '<button class="btn small' + (i === 0 ? '' : ' ghost') + '" data-act="start-chat" data-offer="' + o.id + '">대화 시작</button>' +
        '</article>';
    }).join('') : '<div class="empty">아직 도착한 제안이 없어요.<br>보통 직원들이 근무 시간에 확인해요.</div>';
    return '<div class="phone">' +
      head({ back: '#/home', kicker: '받은 제안', title: '제안 ' + offers.length + '건이 도착했어요' }) +
      '<main class="body">' +
        '<div class="card" style="gap:6px"><div class="title" style="font-size:15px">' + e(r.purpose) + ' ' + UI.won(r.amount) + ' · ' + r.term + '개월</div>' + requestTags(r, true) + '</div>' +
        '<p class="hint" style="margin:0">도착한 순서대로 보여드려요. 플랫폼은 특정 상품을 추천하지 않아요. 금리·한도는 지점 심사 후 확정돼요.</p>' +
        cards +
        (r.status === 'open'
          ? '<button class="btn plain small" data-act="close-request" data-id="' + r.id + '">이 조건 마감하기 (더 이상 제안 받지 않음)</button>'
          : '<div class="box white" style="text-align:center">마감된 조건이에요.</div>') +
      '</main>' + tabs('home', true) + '</div>';
  }

  /* ---------- 5. 대화 목록 ---------- */
  function threads() {
    var u = Store.me(), list = Store.threadsOf(u.id);
    var rows = list.length ? list.map(function (t) {
      var other = Store.user(u.id === t.borrowerId ? t.bankerId : t.borrowerId);
      var ms = Store.messagesOf(t.id), last = ms[ms.length - 1];
      var preview = last ? (last.type === 'booking' ? '[상담 예약 요청]' : last.text) : '';
      var r = Store.request(t.requestId);
      return '<button class="card" data-act="go" data-to="#/chat/' + t.id + '" style="text-align:left;cursor:pointer;gap:4px">' +
        '<div class="card-top"><span class="title" style="font-size:15px">' + e(u.role === 'banker' ? other.name + '님' : UI.bankerLabel(other)) + '</span>' +
        '<span class="meta">' + (last ? UI.ago(last.createdAt) : '') + '</span></div>' +
        '<span class="meta">' + e(r.purpose + ' ' + UI.won(r.amount)) + '</span>' +
        '<span style="font-size:14px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + e(preview) + '</span>' +
        '</button>';
    }).join('') : '<div class="empty">아직 대화가 없어요.' + (u.role === 'banker' ? '<br>수요자가 내 제안을 선택하면 대화가 열려요.' : '<br>받은 제안에서 "대화 시작"을 눌러 보세요.') + '</div>';
    return '<div class="phone">' + head({ title: '대화', navy: u.role === 'banker' }) +
      '<main class="body">' + rows + '</main>' + tabs('threads') + '</div>';
  }

  /* ---------- 6. 대화방 + 상담 예약 ---------- */
  function chat(id, state) {
    var u = Store.me(), t = Store.thread(id);
    if (!t) return notFound();
    var isBanker = u.id === t.bankerId;
    var other = Store.user(isBanker ? t.borrowerId : t.bankerId);
    var ms = Store.messagesOf(t.id);
    var risky = ms.some(function (m) { return m.type === 'text' && UI.riskWords(m.text).length; });
    var blocked = Store.threadBlocked(t.id), iBlocked = Store.isBlocked(other.id);

    var bubbles = ms.map(function (m) {
      if (m.from === 'system') return '<div class="box info" style="align-self:center;text-align:center;font-size:12px">' + e(m.text) + '</div>';
      var mine = m.from === u.id;
      if (m.type === 'precheck') {
        var pc = m.precheck, bk = Store.user(m.from).banker;
        return '<div class="booking" style="border-color:#BFE3CB">' +
          '<div class="card-top"><span style="font-size:12px;font-weight:700;color:var(--good)">사전 한도 조회 안내</span>' +
          '<span class="badge ' + (pc.status === 'done' ? 'good">조회 완료' : 'good">은행 공식 채널') + '</span></div>' +
          '<div class="title" style="font-size:15px">' + e(bk.org) + ' 공식 앱 · ' + e(pc.product || '사전 한도 조회') + '</div>' +
          '<div class="meta" style="color:var(--ink-2)">연결 주소: [' + e(bk.org) + ' 공식 도메인] · 플랫폼이 등록·확인한 주소</div>' +
          '<ul style="margin:0;padding-left:18px;font-size:12.5px;color:var(--ink-2);line-height:1.6">' +
            '<li>서류 제출과 소득·재직 정보 조회는 <b>' + e(bk.org) + ' 앱 안에서만</b> 이뤄져요.</li>' +
            '<li>이 앱(플랫폼)은 조회 결과나 서류를 받거나 보관하지 않아요.</li>' +
            '<li>조회 방식에 따라 신용점수 영향 여부가 다를 수 있으니 은행 화면에서 확인하세요.</li></ul>' +
          (!isBanker && pc.status !== 'done'
            ? '<div class="row"><button class="btn small" style="background:var(--good)" data-act="open-bank">' + e(bk.org) + ' 앱에서 열기</button>' +
              '<button class="btn small plain" data-act="precheck-done" data-id="' + m.id + '">조회 완료했어요</button></div>'
            : '') +
          '</div>';
      }
      if (m.type === 'booking') {
        var b = m.booking;
        var st = { requested: ['warn', '확정 대기'], confirmed: ['good', '예약 확정'], declined: ['gray', '다른 시간 요청됨'] }[b.status];
        var btns = (!isBanker && b.status === 'requested')
          ? '<div class="row"><button class="btn plain small" data-act="booking" data-id="' + m.id + '" data-status="declined">다른 시간 요청</button>' +
            '<button class="btn small" data-act="booking" data-id="' + m.id + '" data-status="confirmed">예약 확정</button></div>' : '';
        return '<div class="booking"><div class="card-top"><span style="font-size:12px;font-weight:700;color:var(--accent-ink)">상담 예약 요청</span>' +
          '<span class="badge ' + st[0] + '">' + st[1] + '</span></div>' +
          '<div class="kv"><span>일시</span><span>' + e(b.date) + ' ' + e(b.time) + '</span></div>' +
          '<div class="kv"><span>장소</span><span>' + e(b.place) + '</span></div>' +
          '<div class="kv"><span>준비 서류</span><span>지점에서 안내</span></div>' + btns + '</div>';
      }
      return '<div class="bubble ' + (mine ? 'me' : 'them') + '">' + e(m.text) + '</div>' +
        '<span class="bubble-time' + (mine ? ' me' : '') + '">' + UI.hm(m.createdAt) + '</span>';
    }).join('');

    var stage = Store.stageOf(t.id);
    var tracker = '<div style="background:var(--card);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;gap:4px;align-items:center;flex-wrap:wrap" aria-label="진행 단계">' +
      ['제안 선택', '사전 조회', '상담 예약', '지점 약정'].map(function (name, i) {
        var n = i + 1, st = n < stage ? 'done' : n === stage ? 'now' : 'next';
        var style = st === 'done' ? 'background:var(--good-soft);color:var(--good)' : st === 'now' ? 'background:var(--accent);color:#fff;font-weight:700' : 'background:#EEF0F3;color:var(--muted)';
        return (i ? '<span style="color:#9AA1AD">›</span>' : '') +
          '<span style="font-size:12px;padding:4px 8px;border-radius:999px;' + style + '"' + (st === 'now' ? ' aria-current="step"' : '') + '>' + (st === 'done' ? '✓ ' : '') + name + '</span>';
      }).join('') + '</div>';
    var req = Store.request(t.requestId);
    var bankerTools = isBanker && !blocked
      ? '<div class="card" style="gap:8px"><span class="meta">수요자 정보 (선택 후 공개)</span>' + summaryTags(req, true) +
        '<div class="row"><button class="btn small plain" data-act="send-precheck" data-thread="' + t.id + '">사전조회 안내 보내기</button>' +
        '<button class="btn small navy" data-act="toggle-booking">상담 예약 잡기</button></div></div>'
      : '';

    var bookingForm = (isBanker && state.bookingOpen)
      ? '<form class="booking" data-form="booking" data-thread="' + t.id + '">' +
          '<div style="font-size:13px;font-weight:700">상담 예약 보내기</div>' +
          '<div class="grid2"><div class="field"><label for="bk-d">날짜</label><input class="input" type="date" id="bk-d" name="date"></div>' +
          '<div class="field"><label for="bk-t">시간</label><input class="input" type="time" id="bk-t" name="time" value="14:00"></div></div>' +
          '<div class="field"><label for="bk-p">장소</label><input class="input" id="bk-p" name="place" value="' + e(u.banker.org + ' ' + u.banker.branch) + '"></div>' +
          '<div class="row"><button type="button" class="btn plain small" data-act="toggle-booking">취소</button><button class="btn small navy" type="submit">예약 요청 보내기</button></div>' +
        '</form>' : '';

    return '<div class="phone">' +
      '<header class="head" style="padding:14px 16px;border-bottom:1px solid var(--line)"><div class="head-row">' +
        '<button class="back" data-act="go" data-to="#/threads" aria-label="뒤로">' + I('back', 22) + '</button>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:2px">' +
          '<span class="title" style="font-size:15px">' + e(isBanker ? other.name + '님 (수요자)' : other.name + ' ' + (other.title || '')) + '</span>' +
          '<span class="meta">' + (isBanker
            ? '연락처 ' + e(other.phone || '미등록') + ' · ' + e(Regions.fullLabel(Store.request(t.requestId)))
            : e(other.banker.org + ' ' + other.banker.branch) + ' · 재직 인증 완료') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:2px;flex:none">' +
          '<button class="btn small plain" style="min-height:32px;padding:0 10px;font-size:12px" data-act="go" data-to="#/report/thread/' + t.id + '">신고</button>' +
          '<button class="btn small plain" style="min-height:32px;padding:0 10px;font-size:12px" data-act="' + (iBlocked ? 'unblock' : 'block') + '" data-user="' + other.id + '">' +
            (iBlocked ? '차단 해제' : '차단') + '</button>' +
        '</div>' +
      '</div></header>' + tracker +
      '<main class="chat" id="chat-scroll">' +
        '<div class="box bad" style="display:flex;gap:8px;align-items:flex-start;font-size:12px">' + I('warn', 16) +
          '<span>신분증·통장 사진, 비밀번호, 선입금을 요구하면 사기일 수 있어요. 서류는 은행 공식 앱이나 지점에서만 제출하세요.</span></div>' +
        bankerTools + bubbles +
        (risky ? '<div class="box bad" role="alert" style="font-size:12px">이 대화에 주의가 필요한 단어가 있어요. 금융사는 대출 전에 돈이나 비밀번호를 요구하지 않아요.</div>' : '') +
        bookingForm +
      '</main>' +
      (blocked
        ? '<div class="composer" style="justify-content:center"><span class="meta" role="status">' +
            (iBlocked ? '차단한 상대예요. 차단을 풀면 다시 대화할 수 있어요.' : '이 대화는 더 이상 메시지를 보낼 수 없어요.') + '</span></div>'
        : '<form class="composer" data-form="message" data-thread="' + t.id + '">' +
            '<label for="msg" class="sr">메시지 입력</label>' +
            '<input class="input" id="msg" name="text" placeholder="메시지 입력" autocomplete="off">' +
            '<button class="send" type="submit" aria-label="보내기">' + I('send', 18) + '</button>' +
          '</form>') +
      tabs('threads', true) + '</div>';
  }

  /* ---------- 7. 은행 직원: 재직 인증 ---------- */
  function verify() {
    var u = Store.me(), b = u.banker;
    if (b.status === 'pending') {
      return '<div class="phone narrow">' + head({ navy: true, kicker: '재직 인증', title: '심사 중이에요', sub: '보통 영업일 기준 1~2일 걸려요. (예시)' }) +
        '<main class="body">' +
          '<div class="card"><div class="kv"><span>소속</span><span>' + e(b.org + ' ' + b.branch) + '</span></div>' +
          '<div class="kv"><span>회사 이메일</span><span>' + e(b.email) + '</span></div>' +
          '<div class="kv"><span>제출 서류</span><span>' + e(b.fileName || '-') + '</span></div></div>' +
          (Server.enabled()
            ? '<div class="box info">운영자가 서류를 확인한 뒤 승인해요. 승인되면 이 화면이 자동으로 게시판으로 바뀌어요.</div>'
            : '<div class="box info">실제 서비스에서는 운영자가 서류를 확인한 뒤 승인해요.</div>' +
              '<button class="btn navy" data-act="approve">시연용: 심사 승인하기</button>') +
        '</main>' + tabs('me') + '</div>';
    }
    return '<div class="phone narrow">' +
      head({ navy: true, kicker: '금융사 직원 · 재직 인증', title: '인증된 직원만<br>제안할 수 있어요' }) +
      '<form class="body" data-form="verify" novalidate>' +
        (b.status === 'rejected'
          ? '<div class="box bad" role="alert">재직 인증이 반려됐어요.' + (b.rejectReason ? '<br><b>사유:</b> ' + e(b.rejectReason) : '') +
            '<br>내용을 고쳐 다시 신청해 주세요.</div>' : '') +
        '<div class="grid2">' +
          '<div class="field"><label for="vf-org">소속 금융사</label><input class="input" id="vf-org" name="org" placeholder="A은행"></div>' +
          '<div class="field"><label for="vf-br">지점·부서</label><input class="input" id="vf-br" name="branch" placeholder="상남지점"></div>' +
        '</div>' +
        '<div class="field"><label for="vf-title">직급</label><input class="input" id="vf-title" name="title" placeholder="대리"></div>' +
        '<div class="field"><label for="vf-mail">회사 이메일</label><input class="input" id="vf-mail" name="email" type="email" placeholder="name@회사도메인">' +
          '<div class="hint">개인 메일(gmail, naver 등)은 받지 않아요.</div></div>' +
        '<div class="field"><label for="vf-file">재직 증빙 (재직증명서 또는 사원증)</label>' +
          '<input class="input" id="vf-file" name="file" type="file" accept="image/*,.pdf" style="padding:10px 14px;height:auto">' +
          '<div class="hint">주민등록번호 뒷자리 등 불필요한 정보는 가리고 올려주세요. ' +
            (Server.enabled() ? '운영자만 볼 수 있는 비공개 보관함에 저장돼요.' : '시제품에서는 파일 이름만 기록해요.') + '</div></div>' +
        '<label class="check box white"><input type="checkbox" name="policyOk">소속 회사의 내부 규정상 본 플랫폼을 통한 고객 상담이 허용됨을 확인합니다.</label>' +
        '<div class="error" id="vf-err" role="alert"></div>' +
        '<button class="btn navy" type="submit">인증 신청하기</button>' +
      '</form>' + tabs('me') + '</div>';
  }

  /* ---------- 8. 은행 직원: 수요 게시판 ---------- */
  function board(state) {
    var u = Store.me();
    var sido = state.boardSido || '', sgg = state.boardSgg || '', onlyNew = !!state.boardOnlyNew;
    var employ = state.boardEmploy || '', sort = state.boardSort || 'new';
    var list = Store.openRequests().filter(function (r) {
      if (r.userId === u.id) return false;
      if (Store.blockedWith(r.userId)) return false;      // 차단한 수요자의 글은 숨김
      if (sido && r.sido !== sido) return false;
      if (sgg && r.sgg !== sgg) return false;
      if (employ && r.employ !== employ) return false;
      if (onlyNew && Store.hasOffered(u.id, r.id)) return false;
      return true;
    }).sort(function (a, b) {
      return sort === 'amount' ? b.amount - a.amount : (a.createdAt < b.createdAt ? 1 : -1);
    });
    var showSgg = sido && !Regions.noSgg(sido);
    var cards = list.length ? list.map(function (r) {
      var done = Store.hasOffered(u.id, r.id), n = Store.offerCount(r.id);
      return '<article class="card">' +
        '<div class="card-top"><span class="meta">익명 수요자 · ' + UI.ago(r.createdAt) + '</span>' +
          '<span style="display:flex;align-items:center;gap:4px"><span class="meta">제안 ' + n + '건</span>' + reportLink('request', r.id) + '</span></div>' +
        '<div class="title">' + e(r.purpose) + ' ' + UI.won(r.amount) + ' · ' + r.term + '개월</div>' + requestTags(r) +
        (done ? '<button class="btn small plain" disabled>내 제안 보냄</button>'
              : '<button class="btn small navy" data-act="go" data-to="#/propose/' + r.id + '">상품 역제안하기</button>') +
        '</article>';
    }).join('') : '<div class="empty">조건에 맞는 수요가 없어요.</div>';
    return '<div class="phone">' +
      head({ navy: true, kicker: '은행 직원용', title: '수요자 게시판', sub: e(UI.bankerLabel(u)) }) +
      '<div style="background:#fff;border-bottom:1px solid var(--line);padding:10px 20px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<label for="bd-sido" class="sr">시·도</label><select id="bd-sido" class="input" data-change="board-sido" style="height:40px;width:auto;font-size:14px">' +
          options(Regions.isNationwide() ? '전국' : Regions.areaName() + ' 전체', Regions.sidos(), sido) + '</select>' +
        (showSgg ? '<label for="bd-sgg" class="sr">시·군·구</label><select id="bd-sgg" class="input" data-change="board-sgg" style="height:40px;width:auto;font-size:14px">' +
          options('전체 시·군·구', Regions.sggs(sido), sgg) + '</select>' : '') +
        '<label for="bd-sort" class="sr">정렬</label><select id="bd-sort" class="input" data-change="board-sort" style="height:40px;width:auto;font-size:14px">' +
          '<option value="new"' + (sort === 'new' ? ' selected' : '') + '>최신순</option><option value="amount"' + (sort === 'amount' ? ' selected' : '') + '>금액 큰 순</option></select>' +
        '<label class="check" style="align-items:center"><input type="checkbox" data-change="board-only-new"' + (onlyNew ? ' checked' : '') + '>아직 제안 안 한 것만</label>' +
        '<div class="chips" role="group" aria-label="고용 형태" style="width:100%">' + [['', '전체'], ['직장인', '직장인'], ['개인사업자', '개인사업자'], ['프리랜서', '프리랜서']].map(function (x) {
          var on = x[0] === employ;
          return '<button type="button" class="chip' + (on ? ' on' : '') + '" style="min-height:36px;font-size:13px" data-act="board-employ" data-val="' + x[0] + '" aria-pressed="' + on + '">' + x[1] + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<p class="hint" style="margin:10px 20px 0">수요 글 ' + list.length + '건</p>' +
      '<main class="body">' + cards +
        '<p class="notice">수요자 실명·연락처·상세 지역·연체 이력은 수요자가 직원을 선택한 뒤에만 공개돼요. 다른 직원의 제안 내용은 보이지 않아요.</p></main>' +
      tabs('board') + '</div>';
  }

  /* ---------- 9. 은행 직원: 역제안 작성 ---------- */
  function propose(reqId) {
    var r = Store.request(reqId);
    if (!r) return notFound();
    return '<div class="phone narrow">' +
      head({ navy: true, back: '#/board', title: '상품 역제안 작성' }) +
      '<form class="body" data-form="offer" data-req="' + r.id + '" novalidate>' +
        '<div class="card" style="gap:6px"><span class="meta">수요자 요청</span>' +
          '<div class="title" style="font-size:15px">' + e(r.purpose) + ' ' + UI.won(r.amount) + ' · ' + r.term + '개월</div>' + requestTags(r) +
          '<span class="hint">수요자가 직접 입력한 구간이에요. 정확한 심사는 대화 시작 후 은행 공식 앱 사전조회로 안내하세요.</span></div>' +
        '<div class="field"><label for="of-prod">제안 상품명</label><input class="input" id="of-prod" name="product" placeholder="예: 소상공인 운영자금대출"></div>' +
        '<div class="grid3">' +
          '<div class="field"><label for="of-rate">예상 금리</label><input class="input" id="of-rate" name="rate" placeholder="연 5.4%"></div>' +
          '<div class="field"><label for="of-limit">한도(만)</label><input class="input" id="of-limit" name="limit" inputmode="numeric" value="' + r.amount + '"></div>' +
          '<div class="field"><label for="of-term">기간(월)</label><input class="input" id="of-term" name="term" inputmode="numeric" value="' + r.term + '"></div>' +
        '</div>' +
        '<div class="field"><label for="of-alt">대안 조건 (선택)</label><input class="input" id="of-alt" name="alt" placeholder="예: 한도 2,000만 원이면 연 5.9%까지 가능"></div>' +
        '<div class="field"><label for="of-memo">수요자에게 전할 말</label><textarea class="input" id="of-memo" name="memo" placeholder="상품 특징, 확인이 필요한 서류 등"></textarea></div>' +
        '<label class="check box white"><input type="checkbox" name="notice">예상 조건이며 최종 금리·한도는 지점 심사 후 확정됨을 고지합니다. (소속사 광고 심의 기준 준수)</label>' +
        '<div class="error" id="of-err" role="alert"></div>' +
        '<button class="btn navy" type="submit">제안 보내기</button>' +
      '</form>' + tabs('board', true) + '</div>';
  }

  /* ---------- 9-1. 수요자: 직원 제안 게시판 (내 요청에 온 제안만) ---------- */
  function offersBoard(state) {
    var u = Store.me(), mine = Store.myRequests(u.id);
    var sel = state.offersReq || '';
    var all = Store.offersToUser(u.id), list = Store.offersToUser(u.id, sel);
    var cards = list.length ? list.map(function (o) {
      var b = Store.user(o.bankerId), r = Store.request(o.requestId);
      return '<article class="card">' +
        '<div class="card-top"><span class="meta">' + UI.ago(o.createdAt) + ' 도착</span>' +
          '<span style="display:flex;align-items:center;gap:4px"><span class="badge good">재직 인증</span>' + reportLink('offer', o.id) + '</span></div>' +
        '<div class="title" style="font-size:15px">' + e(b.banker.org + ' ' + b.banker.branch) + '</div>' +
        '<div class="meta">' + e(b.name + ' ' + (b.title || '')) + ' · ' + e(o.product) + '</div>' +
        '<div class="grid3">' +
          '<div class="stat"><span class="k">예상 금리</span><span class="v blue">' + e(o.rate) + '</span></div>' +
          '<div class="stat"><span class="k">한도</span><span class="v">' + UI.manShort(o.limit) + '</span></div>' +
          '<div class="stat"><span class="k">기간</span><span class="v">' + o.term + '개월</span></div>' +
        '</div>' +
        (o.alt ? '<div class="box warn">대안 제시: ' + e(o.alt) + '</div>' : '') +
        '<div class="box white" style="font-size:12px">내 요청: ' + e(r.purpose + ' ' + UI.won(r.amount) + ' · ' + Regions.publicLabel(r)) + '</div>' +
        '<button class="btn small" data-act="start-chat" data-offer="' + o.id + '">이 직원과 대화 시작</button>' +
        '</article>';
    }).join('') : '<div class="empty">아직 받은 제안이 없어요.</div>';
    return '<div class="phone">' +
      head({ kicker: '대출 수요자', title: '직원 제안 게시판', sub: '내 요청에 온 제안만 보여요.' }) +
      '<div style="background:#fff;border-bottom:1px solid var(--line);padding:10px 20px;display:flex;flex-direction:column;gap:6px">' +
        '<span class="title" style="font-size:14px">내 요청에 온 제안 ' + all.length + '건</span>' +
        '<label for="of-req" class="sr">내 요청</label><select id="of-req" class="input" data-change="offers-req" style="height:40px;font-size:14px">' +
          '<option value="">내 요청 전체 (' + mine.length + '건)</option>' + mine.map(function (r) {
            return '<option value="' + r.id + '"' + (r.id === sel ? ' selected' : '') + '>' + e(r.purpose + ' ' + UI.won(r.amount)) + ' · 제안 ' + Store.offersFor(r.id).length + '건</option>';
          }).join('') + '</select>' +
      '</div>' +
      '<p class="hint" style="margin:10px 20px 0">받은 제안 ' + list.length + '건 · 도착 순</p>' +
      '<main class="body">' + cards +
        '<p class="notice">제안은 도착한 순서대로 보여요. 플랫폼은 순위를 매기거나 특정 상품을 추천하지 않아요. 금리·한도는 지점 심사 후 확정돼요.</p></main>' +
      tabs('offers') + '</div>';
  }

  /* ---------- 10. 은행 직원: 보낸 제안 ---------- */
  function myOffers() {
    var u = Store.me(), list = Store.offersBy(u.id);
    var cards = list.length ? list.map(function (o) {
      var r = Store.request(o.requestId);
      return '<article class="card"><div class="card-top"><span class="meta">' + UI.ago(o.createdAt) + ' 보냄</span>' +
        (r.status === 'closed' ? '<span class="badge gray">마감</span>' : '<span class="badge warn">응답 대기</span>') + '</div>' +
        '<div class="title" style="font-size:15px">' + e(r.purpose) + ' ' + UI.won(r.amount) + '</div>' +
        '<div class="meta">' + e(o.product) + ' · ' + e(o.rate) + ' · ' + UI.manShort(o.limit) + ' · ' + o.term + '개월</div></article>';
    }).join('') : '<div class="empty">아직 보낸 제안이 없어요.</div>';
    return '<div class="phone">' + head({ navy: true, title: '보낸 제안' }) + '<main class="body">' + cards + '</main>' + tabs('my-offers') + '</div>';
  }

  /* ---------- 11. 내 정보 ---------- */
  function me() {
    var u = Store.me(), isB = u.role === 'banker';
    var st = isB ? ({ none: ['warn', '미인증'], pending: ['warn', '심사 중'], verified: ['good', '인증 완료'], rejected: ['warn', '반려됨'] }[u.banker.status] || ['warn', '미인증']) : null;
    return '<div class="phone narrow">' + head({ navy: isB, title: '내 정보' }) +
      '<main class="body">' +
        '<div class="card"><div class="kv"><span>이름</span><span>' + e(u.name + (u.title ? ' ' + u.title : '')) + '</span></div>' +
        '<div class="kv"><span>역할</span><span>' + (isB ? '금융사 직원' : '대출 수요자') + '</span></div>' +
        (u.phone ? '<div class="kv"><span>휴대폰</span><span>' + e(u.phone) + '</span></div>' : '') +
        (isB ? '<div class="kv"><span>소속</span><span>' + e((u.banker.org || '-') + ' ' + (u.banker.branch || '')) + '</span></div>' +
               '<div class="kv"><span>재직 인증</span><span class="badge ' + st[0] + '">' + st[1] + '</span></div>' : '') +
        '</div>' +
        (isB && u.banker.status !== 'verified' ? '<button class="btn navy" data-act="go" data-to="#/verify">재직 인증 하러 가기</button>' : '') +
        blockedCard() +
        (Store.isAdmin() ? '<button class="btn navy" data-act="go" data-to="#/admin">운영자 화면 (인증 심사 · 신고)' +
            (adminPending() + openReports() ? ' · 대기 ' + (adminPending() + openReports()) + '건' : '') + '</button>' : '') +
        '<button class="btn plain" data-act="logout">로그아웃</button>' +
        '<button class="btn plain" data-act="delete-account" style="color:var(--danger, #B42318)">회원 탈퇴</button>' +
        '<div class="hint">탈퇴하면 내가 올린 조건·제안·대화가 모두 지워지고 되돌릴 수 없어요.</div>' +
        '<p class="notice">손들면은 대출을 취급하지 않으며, 계약은 해당 금융사 지점에서 체결됩니다.</p>' +
      '</main>' + tabs('me') + '</div>';
  }

  /* 내가 차단한 사용자 목록 (해제 가능) */
  function blockedCard() {
    var ids = Store.blockedUsers();
    if (!ids.length) return '';
    return '<div class="card" style="gap:8px"><span class="title" style="font-size:15px">차단한 사용자 ' + ids.length + '명</span>' +
      ids.map(function (id) {
        var x = Store.user(id);
        var label = !x ? '익명 수요자' : x.role === 'banker' ? UI.bankerLabel(x) : (x.name ? x.name + '님' : '익명 수요자');
        return '<div class="kv" style="align-items:center"><span>' + e(label) + '</span>' +
          '<button class="btn small plain" style="min-height:32px;width:auto;padding:0 12px" data-act="unblock" data-user="' + id + '">차단 해제</button></div>';
      }).join('') +
      '<div class="hint">차단하면 서로의 조건·제안이 보이지 않고 대화를 주고받을 수 없어요.</div></div>';
  }

  /* ---------- 11-1. 신고하기 ---------- */
  var REASONS = ['사기·선입금 요구', '개인정보·서류 요구', '욕설·비방', '광고·스팸', '허위 정보', '기타'];
  function reportTarget(kind, id) {
    var u = Store.me();
    if (kind === 'request') {
      var r = Store.request(id); if (!r) return null;
      return { targetId: r.userId, back: '#/board', what: '이 대출 조건 글',
               snapshot: '[조건 글] ' + r.purpose + ' ' + UI.won(r.amount) + ' · ' + r.term + '개월 · ' + r.repay + ' · ' + r.rate + ' · ' + Regions.publicLabel(r) };
    }
    if (kind === 'offer') {
      var o = Store.offer(id); if (!o) return null;
      var b = Store.user(o.bankerId) || { banker: {} };
      return { targetId: o.bankerId, back: '#/offers', what: '이 제안 (' + UI.bankerLabel(b) + ')',
               snapshot: '[제안] ' + UI.bankerLabel(b) + ' · ' + o.product + ' · ' + o.rate + ' · ' + UI.manShort(o.limit) + ' · ' + o.term + '개월' +
                         (o.alt ? '\n대안: ' + o.alt : '') + (o.memo ? '\n메모: ' + o.memo : '') };
    }
    if (kind === 'thread') {
      var t = Store.thread(id); if (!t || (t.borrowerId !== u.id && t.bankerId !== u.id)) return null;
      var other = Store.user(t.borrowerId === u.id ? t.bankerId : t.borrowerId) || {};
      var lines = Store.messagesOf(t.id).filter(function (m) { return m.from !== 'system'; }).slice(-30).map(function (m) {
        var who = m.from === u.id ? '나(' + u.name + ')' : (other.name || '상대');
        var body = m.type === 'booking' ? '[상담 예약 요청] ' + m.booking.date + ' ' + m.booking.time + ' ' + m.booking.place
                 : m.type === 'precheck' ? '[사전조회 안내]' : m.text;
        return UI.hm(m.createdAt) + ' ' + who + ': ' + body;
      });
      return { targetId: other.id, back: '#/chat/' + t.id, what: (other.role === 'banker' ? UI.bankerLabel(other) : (other.name || '상대') + '님') + '과의 대화',
               snapshot: '[대화]\n' + lines.join('\n') };
    }
    return null;
  }
  function report(kind, id) {
    var x = reportTarget(kind, id);
    if (!x) return notFound();
    var me = Store.me(), already = x.targetId && Store.isBlocked(x.targetId);
    return '<div class="phone narrow">' + head({ back: x.back, navy: me.role === 'banker', kicker: '신고하기', title: '무엇이 문제인가요?', sub: '신고 대상: ' + e(x.what) }) +
      '<form class="body" data-form="report" data-kind="' + kind + '" data-id="' + id + '" novalidate>' +
        '<div class="field"><span class="label" id="rp-reason-l">신고 사유</span>' + chipGroup('reason', REASONS, 'rp-reason-l') + '</div>' +
        '<div class="field"><label for="rp-detail">자세한 내용 (선택)</label><textarea class="input" id="rp-detail" name="detail" maxlength="1000" placeholder="예: 대출 전에 수수료를 먼저 보내라고 했어요."></textarea></div>' +
        (x.targetId && !already ? '<label class="check box white"><input type="checkbox" name="block" checked>이 사용자를 차단할게요. 서로의 조건·제안이 안 보이고 대화가 막혀요.</label>' : '') +
        '<div class="box info" style="font-size:12.5px">신고하면 ' + (kind === 'thread' ? '이 대화 내용' : '이 글의 내용') + '이 운영자에게 전달돼요. 운영자가 확인한 뒤 게시물을 내리거나 이용을 제한해요. 신고한 사실은 상대에게 알리지 않아요.</div>' +
        '<div class="error" id="rp-err" role="alert"></div>' +
        '<button class="btn' + (me.role === 'banker' ? ' navy' : '') + '" type="submit">신고하기</button>' +
        '<div class="hint">돈을 보냈거나 보이스피싱이 의심되면 바로 경찰청(112)이나 금융감독원(1332)에도 신고해 주세요.</div>' +
      '</form></div>';
  }

  /* ---------- 12. 운영자: 재직 인증 심사 ---------- */
  function adminPending() {
    return Store.verifications().filter(function (v) { return v.status === 'pending'; }).length;
  }
  function openReports() {
    return Store.reports().filter(function (r) { return r.status === 'open'; }).length;
  }
  function adminSwitch(view) {
    var nV = adminPending(), nR = openReports();
    return '<div class="chips" role="group" aria-label="운영자 메뉴">' +
      [['verif', '재직 인증 심사' + (nV ? ' ' + nV : '')], ['reports', '신고 처리' + (nR ? ' ' + nR : '')]].map(function (x) {
        var on = view === x[0];
        return '<button class="chip' + (on ? ' on' : '') + '" data-act="admin-view" data-val="' + x[0] + '" aria-pressed="' + on + '">' + x[1] + '</button>';
      }).join('') + '</div>';
  }
  function admin(state) {
    if (state.adminView === 'reports') return adminReports(state);
    var tab = state.adminTab || 'pending';
    var all = Store.verifications();
    var n = { pending: 0, verified: 0, rejected: 0 };
    all.forEach(function (v) { n[v.status] = (n[v.status] || 0) + 1; });
    var list = all.filter(function (v) { return v.status === tab; });
    var labels = [['pending', '대기'], ['verified', '승인'], ['rejected', '반려']];
    var filter = '<div class="chips" role="group" aria-label="심사 상태">' + labels.map(function (x) {
      var on = tab === x[0];
      return '<button class="chip' + (on ? ' on' : '') + '" data-act="admin-tab" data-val="' + x[0] + '" aria-pressed="' + on + '">' +
        x[1] + ' ' + (n[x[0]] || 0) + '</button>';
    }).join('') + '</div>';

    function proof(v) {
      if (!v.filePath) return '<div class="hint">올린 파일이 없어요.</div>';
      var url = Server.docUrl(v.filePath);
      if (!url) return '<div class="hint">증빙 파일 불러오는 중…</div>';
      if (url === 'error') return '<div class="box bad">증빙 파일을 열 수 없어요. (Supabase → Storage → verification-docs에서 직접 확인)</div>';
      var isImg = /\.(png|jpe?g|gif|webp|heic)$/i.test(v.filePath);
      return (isImg ? '<a href="' + e(url) + '" target="_blank" rel="noopener"><img src="' + e(url) + '" alt="재직 증빙: ' + e(v.fileName) +
                      '" style="display:block;width:100%;max-height:280px;object-fit:contain;background:#F4F6FA;border-radius:12px"></a>' : '') +
        '<a class="btn small plain" href="' + e(url) + '" target="_blank" rel="noopener">증빙 파일 크게 보기 (' + e(v.fileName || '파일') + ')</a>';
    }

    var cards = list.length ? list.map(function (v) {
      var u = Store.user(v.userId) || { name: '(알 수 없음)', banker: {} }, b = u.banker || {};
      var personal = /@(gmail|naver|daum|hanmail|kakao|nate|hotmail|outlook|yahoo|icloud)\./i.test(v.email);
      return '<article class="card" style="gap:10px">' +
        '<div class="card-top"><span class="title">' + e(u.name + (u.title ? ' ' + u.title : '')) + '</span>' +
          '<span class="meta">' + (v.submittedAt ? UI.ago(v.submittedAt) + ' 신청' : '') + '</span></div>' +
        '<div class="kv"><span>소속</span><span>' + e((b.org || '-') + ' ' + (b.branch || '')) + '</span></div>' +
        '<div class="kv"><span>회사 이메일</span><span>' + e(v.email) + (personal ? ' <span class="badge warn">개인 메일?</span>' : '') + '</span></div>' +
        '<div class="kv"><span>내부 규정 확인</span><span>' + (v.policyOk ? '체크함' : '<span class="badge warn">미체크</span>') + '</span></div>' +
        proof(v) +
        (v.status === 'rejected' && v.rejectReason ? '<div class="box bad">반려 사유: ' + e(v.rejectReason) + '</div>' : '') +
        '<div class="grid2">' +
          (v.status !== 'rejected' ? '<button class="btn small plain" data-act="admin-reject" data-id="' + v.userId + '">반려</button>' : '<span></span>') +
          (v.status !== 'verified' ? '<button class="btn small navy" data-act="admin-approve" data-id="' + v.userId + '">승인</button>' : '<span></span>') +
        '</div>' +
      '</article>';
    }).join('') : '<div class="empty">' + { pending: '심사를 기다리는 신청이 없어요.', verified: '아직 승인한 직원이 없어요.', rejected: '반려한 신청이 없어요.' }[tab] + '</div>';

    return '<div class="phone">' + head({ back: '#/me', kicker: '운영자', title: '재직 인증 심사', sub: '증빙을 확인하고 승인하면 그 직원의 게시판이 바로 열려요.' }) +
      '<main class="body">' + adminSwitch('verif') + filter + cards +
        '<div class="box info">확인할 것: ① 증빙의 이름·소속이 신청 내용과 같은지 ② 회사 이메일 도메인이 그 금융사 것인지 ③ 주민번호 등 불필요한 정보가 가려졌는지</div>' +
      '</main>' + tabs('me') + '</div>';
  }

  /* ---------- 12-1. 운영자: 신고 처리 ---------- */
  function adminReports(state) {
    var tab = state.reportTab || 'open', all = Store.reports();
    var n = { open: 0, resolved: 0 }; all.forEach(function (r) { n[r.status] = (n[r.status] || 0) + 1; });
    var list = all.filter(function (r) { return r.status === tab; });
    var filter = '<div class="chips" role="group" aria-label="처리 상태">' + [['open', '접수'], ['resolved', '처리 완료']].map(function (x) {
      var on = tab === x[0];
      return '<button class="chip' + (on ? ' on' : '') + '" data-act="report-tab" data-val="' + x[0] + '" aria-pressed="' + on + '">' + x[1] + ' ' + (n[x[0]] || 0) + '</button>';
    }).join('') + '</div>';
    var KIND = { request: '조건 글', offer: '제안', thread: '대화' };
    function who(id) {
      var x = id && Store.user(id);
      if (!x) return '(탈퇴했거나 알 수 없음)';
      return x.role === 'banker' ? UI.bankerLabel(x) + ' (직원)' : x.name + ' (수요자)';
    }
    var cards = list.length ? list.map(function (r) {
      var target = r.targetId && Store.user(r.targetId), req = r.kind === 'request' ? Store.request(r.refId) : null;
      var log = r.kind === 'thread' ? Store.messagesOf(r.refId) : [];
      var tools = [];
      if (r.status === 'open') {
        if (req && req.status === 'open') tools.push('<button class="btn small plain" data-act="admin-close-request" data-id="' + req.id + '">조건 글 내리기</button>');
        if (target && target.role === 'banker' && target.banker && target.banker.status === 'verified')
          tools.push('<button class="btn small plain" data-act="admin-revoke" data-id="' + target.id + '">재직 인증 취소</button>');
        tools.push('<button class="btn small navy" data-act="admin-resolve" data-id="' + r.id + '">처리 완료</button>');
      }
      return '<article class="card" style="gap:10px">' +
        '<div class="card-top"><span class="title" style="font-size:15px">' + KIND[r.kind] + ' 신고 · ' + e(r.reason) + '</span>' +
          '<span class="meta">' + UI.ago(r.createdAt) + '</span></div>' +
        '<div class="kv"><span>신고한 사람</span><span>' + e(who(r.reporterId)) + '</span></div>' +
        '<div class="kv"><span>신고 대상</span><span>' + e(who(r.targetId)) + '</span></div>' +
        (req ? '<div class="kv"><span>글 상태</span><span>' + (req.status === 'open' ? '게시 중' : '마감(내림)') + '</span></div>' : '') +
        (r.detail ? '<div class="box warn" style="white-space:pre-wrap">' + e(r.detail) + '</div>' : '') +
        (r.snapshot ? '<div><div class="meta">신고 당시 내용 (신고자 화면 기준)</div>' +
          '<div class="box white" style="white-space:pre-wrap;font-size:12.5px;max-height:220px;overflow:auto">' + e(r.snapshot) + '</div></div>' : '') +
        (log.length ? '<div><div class="meta">서버에 저장된 실제 대화 ' + log.length + '건</div>' +
          '<div class="box white" style="font-size:12.5px;max-height:220px;overflow:auto;display:flex;flex-direction:column;gap:4px">' + log.map(function (m) {
            var body = m.type === 'booking' ? '[상담 예약 요청]' : m.type === 'precheck' ? '[사전조회 안내]' : m.text;
            return '<span>' + UI.hm(m.createdAt) + ' <b>' + e(m.from === 'system' ? '안내' : ((Store.user(m.from) || {}).name || '?')) + '</b>: ' + e(body) + '</span>';
          }).join('') + '</div></div>' : '') +
        (r.status === 'resolved' ? '<div class="box info">처리 메모: ' + e(r.adminNote || '-') + '</div>' : '') +
        (tools.length ? '<div class="row" style="flex-wrap:wrap">' + tools.join('') + '</div>' : '') +
      '</article>';
    }).join('') : '<div class="empty">' + (tab === 'open' ? '처리할 신고가 없어요.' : '처리한 신고가 없어요.') + '</div>';
    return '<div class="phone">' + head({ back: '#/me', kicker: '운영자', title: '신고 처리', sub: '내용을 확인하고 글 내리기·인증 취소 등 조치한 뒤 처리 완료를 눌러요.' }) +
      '<main class="body">' + adminSwitch('reports') + filter + cards +
        '<div class="box info">사기·선입금 요구는 바로 조치하고, 필요하면 상대 계정을 Supabase → Authentication → Users에서 삭제해 이용을 막을 수 있어요.</div>' +
      '</main>' + tabs('me') + '</div>';
  }

  function notFound() {
    return '<div class="phone">' + head({ back: '#/', title: '페이지를 찾을 수 없어요' }) + '<main class="body"><div class="empty">삭제됐거나 잘못된 주소예요.</div></main></div>';
  }

  return { reportTarget: reportTarget, report: report, openReports: openReports, admin: admin, adminPending: adminPending, emailLogin: emailLogin, setupError: setupError, loading: loading, signup: signup, home: home, offersBoard: offersBoard, newRequest: newRequest, requestDetail: requestDetail, threads: threads,
           chat: chat, verify: verify, board: board, propose: propose, myOffers: myOffers, me: me, notFound: notFound };
})();
