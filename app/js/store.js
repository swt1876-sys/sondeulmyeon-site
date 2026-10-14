/* =========================================================
   store.js — 앱의 "창고" 담당
   회원, 대출 요청, 제안, 대화 같은 데이터를 보관하고 꺼내 줍니다.
   - 시연 모드: 브라우저 안의 작은 서랍(localStorage)에 저장
   - 서버 모드: js/config.js에 서버 주소를 넣으면, js/server.js가 이 창고를
     공용 창고(서버)와 맞춰 줘요. 창고에 넣을 때마다 server.js에 "택배"를 보냅니다.
   ========================================================= */

var Store = (function () {
  var KEY = 'loan-match-v4';   // 서랍 이름표 (데이터 모양이 바뀌면 숫자를 올려서 새 서랍을 씀)
  var db = null;               // 메모리에 펼쳐 둔 창고 내용
  var remote = null;           // 서버 모드일 때 변경 사항을 받아 갈 택배 기사 (server.js가 연결)
  function push(kind, data) { if (remote) remote(kind, data); }

  function uid(prefix) {
    if (remote) {                                    // 서버 모드는 서버 형식 ID(UUID)
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      var b = new Uint8Array(16); crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    }
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function now() { return new Date().toISOString(); }
  function minutesAgo(m) { return new Date(Date.now() - m * 60000).toISOString(); }

  /* 처음 열었을 때 넣어 두는 예시 데이터(시연용, 모두 가상) */
  function seed() {
    function banker(id, name, title, org, branch) {
      return { id: id, role: 'banker', name: name, title: title, phone: '',
               banker: { org: org, branch: branch, email: id + '@bank.example', status: 'verified', policyOk: true } };
    }
    function anon(n) { return { id: 'u_anon' + n, role: 'borrower', name: '수요자' + n, phone: '010-0000-000' + n }; }
    // 요청 한 건: [id, 작성자, 몇 분 전, 용도, 금액(만), 기간, 상환, 희망금리, 고용형태, 연소득, 기존대출, 연체, 시도, 시군구, 동]
    function req(a) {
      return { id: a[0], userId: a[1], createdAt: minutesAgo(a[2]), purpose: a[3], amount: a[4], term: a[5], repay: a[6], rate: a[7],
               employ: a[8], income: a[9], debt: a[10], late: a[11], sido: a[12], sgg: a[13], dong: a[14], status: 'open' };
    }
    // 제안 한 건: [id, 요청, 직원, 몇 분 전, 상품, 금리, 한도, 기간, 대안, 메모]
    function offer(a) {
      return { id: a[0], requestId: a[1], bankerId: a[2], createdAt: minutesAgo(a[3]), product: a[4], rate: a[5],
               limit: a[6], term: a[7], alt: a[8], memo: a[9] };
    }
    return {
      currentUserId: null,
      users: [
        { id: 'u_demo_b', role: 'borrower', name: '홍길동', phone: '010-1234-5678', consents: { contact: true } },
        anon(1), anon(2), anon(3), anon(4), anon(5), anon(6),
        banker('u_kim', '김민준', '대리', 'A은행', '창원상남지점'),
        banker('u_lee', '이서연', '과장', 'B저축은행', '본점 여신영업부'),
        banker('u_park', '박지훈', '주임', 'C캐피탈', '경남센터'),
        banker('u_choi', '최유진', '계장', 'D은행', '진주지점'),
        banker('u_jung', '정도윤', '대리', 'A은행', '장유지점'),
        banker('u_kang', '강서준', '과장', 'E은행', '김해지점'),
        banker('u_yoon', '윤하은', '차장', 'F은행', '창원중앙지점'),
        banker('u_han', '한지민', '대리', 'B저축은행', '창원지점')
      ],
      requests: [
        req(['r_demo', 'u_demo_b', 10, '사업 운영자금', 3000, 36, '원리금균등', '연 6% 이하', '개인사업자', '3,000만~5,000만', '1,000만 미만', '없음', '경상남도', '창원시 성산구', '상남동']),
        req(['r_a1', 'u_anon1', 60, '시설자금', 5000, 60, '거치 후 분할', '연 6.5% 이하', '개인사업자', '5,000만~7,000만', '1,000만~3,000만', '없음', '경상남도', '김해시', '장유1동']),
        req(['r_a2', 'u_anon2', 180, '생활자금', 1000, 12, '원리금균등', '연 7% 이하', '프리랜서', '2,000만~3,000만', '없음', '없음', '경상남도', '진주시', '평거동']),
        req(['r_a3', 'u_anon3', 300, '보증금 보충', 4000, 24, '만기일시', '연 5% 이하', '직장인', '5,000만~7,000만', '3,000만~5,000만', '없음', '경상남도', '양산시', '물금읍']),
        req(['r_a4', 'u_anon4', 1440, '대환(갈아타기)', 2000, 24, '원리금균등', '기존 연 9.8%보다 낮게', '직장인', '3,000만~5,000만', '1,000만~3,000만', '잘 모름', '경상남도', '김해시', '내외동']),
        req(['r_a5', 'u_anon5', 1500, '사업 운영자금', 7000, 48, '원금균등', '연 5.5% 이하', '개인사업자', '7,000만~1억', '1,000만 미만', '없음', '경상남도', '창원시 성산구', '중앙동']),
        req(['r_demo2', 'u_demo_b', 2880, '대환(갈아타기)', 1500, 36, '원리금균등', '기존 연 11%보다 낮게', '개인사업자', '3,000만~5,000만', '1,000만 미만', '없음', '경상남도', '창원시 성산구', '상남동']),
        req(['r_a6', 'u_anon6', 3000, '창업자금', 3000, 60, '거치 후 분할', '연 6% 이하', '개인사업자', '2,000만 미만', '없음', '없음', '경상남도', '진주시', '충무공동'])
      ],
      offers: [
        offer(['o_1', 'r_demo', 'u_kim', 8, '소상공인 운영자금대출', '연 5.4%', 3000, 36, '', '소상공인 운영자금 상품으로 가능해 보여요. 매출 자료 확인 후 확정됩니다.']),
        offer(['o_2', 'r_demo', 'u_lee', 6, '사업자 신용대출', '연 6.9%', 3000, 48, '한도를 2,000만 원으로 줄이면 연 5.9%까지 가능', '기간을 늘리면 월 상환액 부담이 줄어요.']),
        offer(['o_3', 'r_demo', 'u_park', 3, '자영업자 운영자금', '연 7.2%', 3000, 36, '', '']),
        offer(['o_4', 'r_a2', 'u_choi', 150, '프리랜서 신용대출', '연 6.1%', 1000, 12, '', '소득 신고 내역으로 확인돼요.']),
        offer(['o_5', 'r_a4', 'u_jung', 1300, '대환 전용 신용대출', '연 5.8%', 2000, 24, '', '']),
        offer(['o_6', 'r_a4', 'u_kang', 1200, '직장인 대환대출', '연 6.0%', 2000, 36, '기간 36개월이면 월 상환액이 줄어요', '']),
        offer(['o_7', 'r_a5', 'u_kim', 1400, '소상공인 성장자금', '연 5.1%', 7000, 48, '', '']),
        offer(['o_8', 'r_demo2', 'u_han', 2500, '사업자 대환대출', '연 7.5%', 1500, 36, '담보 제공 시 연 6%대 가능', ''])
      ],
      threads: [],
      messages: [],
      blockList: [],   // 차단 [{ blocker, blocked }]
      reports: []      // 신고
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : seed();
    } catch (e) {
      db = seed();             // 서랍을 못 열면(사생활 보호 모드 등) 메모리에서만 동작
    }
    save();
  }
  function save() {
    if (remote) return;        // 서버 모드에서는 서버가 원본이라 서랍에 저장하지 않음
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* 저장 불가해도 화면은 계속 동작 */ }
  }
  function reset() { db = seed(); save(); }

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- 회원 ---------- */
  function me() { return db.currentUserId ? find(db.users, db.currentUserId) : null; }
  function user(id) { return find(db.users, id); }
  function login(id) { db.currentUserId = id; save(); }
  function logout() { db.currentUserId = null; save(); }
  function signup(data) {
    var u = { id: data.id || uid('u'), role: data.role, name: data.name, phone: data.phone, consents: data.consents || {} };
    if (data.role === 'banker') u.banker = { org: '', branch: '', email: '', status: 'none', policyOk: false };
    db.users.push(u); db.currentUserId = u.id; save(); push('profile', u);
    return u;
  }
  function demoAccounts() {
    // 예시용 익명 수요자를 뺀 모든 계정 (방금 가입한 계정 포함)
    return db.users.filter(function (u) { return u.id.indexOf('u_anon') !== 0; });
  }
  function submitVerification(userId, info) {
    var u = user(userId);
    u.title = info.title;
    u.banker = { org: info.org, branch: info.branch, email: info.email, fileName: info.fileName,
                 policyOk: info.policyOk, status: 'pending', submittedAt: now() };
    save(); push('verification', { user: u, file: info.file });
  }
  function approveVerification(userId) { user(userId).banker.status = 'verified'; save(); }

  /* ---------- 대출 요청(수요자가 올린 조건) ---------- */
  function createRequest(userId, d) {
    var r = { id: uid('r'), userId: userId, amount: d.amount, term: d.term, repay: d.repay, rate: d.rate,
              purpose: d.purpose, employ: d.employ, income: d.income, debt: d.debt, late: d.late,
              sido: d.sido, sgg: d.sgg, dong: d.dong, createdAt: now(), status: 'open' };
    db.requests.unshift(r); save(); push('request', r); return r;
  }
  function request(id) { return find(db.requests, id); }
  function myRequests(userId) { return db.requests.filter(function (r) { return r.userId === userId; }); }
  function openRequests() { return db.requests.filter(function (r) { return r.status === 'open'; }); }
  function closeRequest(id) { request(id).status = 'closed'; save(); push('closeRequest', request(id)); }

  /* ---------- 제안(은행 직원의 역제안) ---------- */
  function createOffer(bankerId, requestId, d) {
    var o = { id: uid('o'), requestId: requestId, bankerId: bankerId, product: d.product, rate: d.rate,
              limit: d.limit, term: d.term, alt: d.alt, memo: d.memo, createdAt: now() };
    db.offers.push(o);
    if (db.offerCounts) db.offerCounts[requestId] = (db.offerCounts[requestId] || 0) + 1;
    save(); push('offer', o); return o;
  }
  function offer(id) { return find(db.offers, id); }
  /* 도착한 순서대로(오래된 것부터) — 플랫폼이 순위를 매기지 않기 위함 */
  function offersFor(requestId) {
    return db.offers.filter(function (o) { return o.requestId === requestId && !blockedWith(o.bankerId); })
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
  }
  /* 내(수요자) 요청 전체에 온 제안, 도착 순 */
  function offersToUser(userId, requestId) {
    return db.offers.filter(function (o) {
      var r = request(o.requestId);
      return r && r.userId === userId && (!requestId || o.requestId === requestId) && !blockedWith(o.bankerId);
    }).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
  }
  /* 요청에 온 제안 개수. 서버 모드의 직원은 남의 제안 내용을 못 받으므로 서버가 세어 준 숫자를 씀 */
  function offerCount(requestId) {
    if (db.offerCounts && db.offerCounts[requestId] != null) return db.offerCounts[requestId];
    return offersFor(requestId).length;
  }
  function offersBy(bankerId) { return db.offers.filter(function (o) { return o.bankerId === bankerId; }); }
  function hasOffered(bankerId, requestId) {
    return db.offers.some(function (o) { return o.bankerId === bankerId && o.requestId === requestId; });
  }

  /* ---------- 대화방과 메시지 ---------- */
  function openThread(offerId) {
    var o = offer(offerId), req = request(o.requestId);
    var t = db.threads.filter(function (x) { return x.offerId === offerId; })[0];
    if (!t) {
      t = { id: uid('t'), offerId: offerId, requestId: req.id, borrowerId: req.userId, bankerId: o.bankerId, createdAt: now() };
      db.threads.push(t);
      var sys = { id: uid('m'), threadId: t.id, from: 'system', type: 'text', createdAt: now(),
        text: '수요자가 이 제안을 선택해 대화가 시작됐어요. 직원에게 연락처 · 상세 지역(' + (req.dong || '-') +
              ') · 최근 1년 연체 이력(' + (req.late || '-') + ')이 공개됐어요.' };
      db.messages.push(sys);
      save(); push('thread', { thread: t, message: sys });
    }
    return t;
  }
  function thread(id) { return find(db.threads, id); }
  function threadsOf(userId) {
    return db.threads.filter(function (t) { return t.borrowerId === userId || t.bankerId === userId; })
      .sort(function (a, b) { return lastAt(b.id) < lastAt(a.id) ? -1 : 1; });
  }
  function messagesOf(threadId) { return db.messages.filter(function (m) { return m.threadId === threadId; }); }
  function lastAt(threadId) {
    var ms = messagesOf(threadId); return ms.length ? ms[ms.length - 1].createdAt : '';
  }
  function addMessage(m) { db.messages.push(m); save(); push('message', m); return m; }
  function sendText(threadId, from, text) {
    addMessage({ id: uid('m'), threadId: threadId, from: from, type: 'text', text: text, createdAt: now() });
  }
  function sendBooking(threadId, from, b) {
    addMessage({ id: uid('m'), threadId: threadId, from: from, type: 'booking', createdAt: now(),
      booking: { date: b.date, time: b.time, place: b.place, status: 'requested' } });
  }
  /* 은행 공식 사전 한도 조회 안내 (서류는 은행 앱에서만) */
  function sendPrecheck(threadId, from, p) {
    addMessage({ id: uid('m'), threadId: threadId, from: from, type: 'precheck', createdAt: now(),
      precheck: { bank: p.bank, product: p.product, status: 'sent' } });
  }
  function setPrecheckDone(messageId) {
    var m = find(db.messages, messageId); m.precheck.status = 'done'; save(); push('messageUpdate', m);
  }
  /* 대화방 진행 단계: 1 제안 선택 → 2 사전 조회 → 3 상담 예약 → 4 지점 약정 */
  function stageOf(threadId) {
    var ms = messagesOf(threadId);
    var pre = ms.some(function (m) { return m.type === 'precheck' && m.precheck.status === 'done'; });
    var booked = ms.some(function (m) { return m.type === 'booking' && m.booking.status === 'confirmed'; });
    return booked ? 4 : pre ? 3 : 2;   // 지금 진행 중인 단계 번호
  }
  function setBookingStatus(messageId, status) {
    var m = find(db.messages, messageId); m.booking.status = status; save(); push('messageUpdate', m);
  }

  /* ---------- 차단 ----------
     내가 차단한 상대: 그 사람의 조건·제안이 안 보이고, 대화는 더 이상 주고받을 수 없어요.
     서버 모드에서는 서버 자물쇠가 상대 쪽에서도 막아 줘요(상대는 누가 차단했는지 몰라요). */
  function blocks() { return db.blockList || (db.blockList = []); }
  function isBlocked(otherId) {           // 내가 이 사람을 차단했나요?
    var me = db.currentUserId;
    return blocks().some(function (b) { return b.blocker === me && b.blocked === otherId; });
  }
  function blockedWith(otherId) {         // 나와 이 사람 사이에 어느 쪽이든 차단이 있나요?
    var me = db.currentUserId;
    return blocks().some(function (b) {
      return (b.blocker === me && b.blocked === otherId) || (b.blocker === otherId && b.blocked === me);
    });
  }
  function blockedUsers() {
    var me = db.currentUserId;
    return blocks().filter(function (b) { return b.blocker === me; }).map(function (b) { return b.blocked; });
  }
  function block(otherId) {
    if (!otherId || isBlocked(otherId)) return;
    var b = { blocker: db.currentUserId, blocked: otherId, createdAt: now() };
    blocks().push(b); save(); push('block', b);
  }
  function unblock(otherId) {
    var me = db.currentUserId;
    db.blockList = blocks().filter(function (b) { return !(b.blocker === me && b.blocked === otherId); });
    save(); push('unblock', { blocker: me, blocked: otherId });
  }
  /* 이 대화방은 차단으로 막혔나요? (상대가 나를 차단한 경우는 서버가 알려 준 목록으로) */
  function threadBlocked(threadId) {
    var t = thread(threadId); if (!t) return false;
    var other = t.borrowerId === db.currentUserId ? t.bankerId : t.borrowerId;
    return blockedWith(other) || (db.blockedThreads || []).indexOf(threadId) !== -1;
  }

  /* ---------- 신고 ---------- */
  function report(d) {
    var r = { id: uid('rp'), reporterId: db.currentUserId, targetId: d.targetId || null, kind: d.kind, refId: d.refId,
              reason: d.reason, detail: d.detail || '', snapshot: (d.snapshot || '').slice(0, 4000),
              status: 'open', adminNote: '', createdAt: now() };
    (db.reports || (db.reports = [])).push(r); save(); push('report', r);
    return r;
  }
  function reports() {
    return (db.reports || []).slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }
  function resolveReport(id, note) {
    var r = find(db.reports || [], id); if (!r) return;
    r.status = 'resolved'; r.adminNote = note || ''; r.resolvedAt = now();
    save(); push('resolveReport', r);
  }

  /* 회원 탈퇴 (시연 모드): 내 계정과 내가 만든 데이터를 서랍에서 지움. 서버 모드는 server.js가 처리 */
  function deleteMe() {
    var id = db.currentUserId; if (!id) return;
    var myReq = db.requests.filter(function (r) { return r.userId === id; }).map(function (r) { return r.id; });
    var gone = function (o) { return o.bankerId === id || myReq.indexOf(o.requestId) !== -1; };
    var goneOffers = db.offers.filter(gone).map(function (o) { return o.id; });
    var goneThreads = db.threads.filter(function (t) { return t.borrowerId === id || t.bankerId === id || goneOffers.indexOf(t.offerId) !== -1; })
      .map(function (t) { return t.id; });
    db.messages = db.messages.filter(function (m) { return goneThreads.indexOf(m.threadId) === -1; });
    db.threads = db.threads.filter(function (t) { return goneThreads.indexOf(t.id) === -1; });
    db.offers = db.offers.filter(function (o) { return !gone(o); });
    db.requests = db.requests.filter(function (r) { return r.userId !== id; });
    db.users = db.users.filter(function (u) { return u.id !== id; });
    db.blockList = blocks().filter(function (b) { return b.blocker !== id && b.blocked !== id; });
    (db.reports || []).forEach(function (r) { if (r.reporterId === id) r.reporterId = null; if (r.targetId === id) r.targetId = null; });
    db.currentUserId = null; save();
  }

  /* ---------- 운영자: 재직 인증 심사 ---------- */
  function isAdmin() { return !!(db && db.isAdmin); }
  function verifications() { return (db.verifications || []).slice().sort(function (a, b) { return a.submittedAt < b.submittedAt ? 1 : -1; }); }
  function reviewVerification(userId, status, reason) {
    var v = (db.verifications || []).filter(function (x) { return x.userId === userId; })[0];
    if (v) { v.status = status; v.rejectReason = reason || ''; v.reviewedAt = now(); }
    var u = user(userId); if (u && u.banker) { u.banker.status = status; u.banker.rejectReason = reason || ''; }
    save(); push('review', { userId: userId, status: status, reason: reason || '' });
  }

  /* server.js 전용: 택배 기사 연결 + 서버에서 받아 온 내용으로 창고를 통째로 교체 */
  function attachRemote(fn) { remote = fn; }
  function replaceAll(next) { db = next; }

  load();

  return {
    block: block, unblock: unblock, isBlocked: isBlocked, blockedWith: blockedWith, blockedUsers: blockedUsers, threadBlocked: threadBlocked,
    report: report, reports: reports, resolveReport: resolveReport,
    isAdmin: isAdmin, verifications: verifications, reviewVerification: reviewVerification,
    attachRemote: attachRemote, replaceAll: replaceAll, deleteMe: deleteMe, offerCount: offerCount,
    reset: reset, me: me, user: user, login: login, logout: logout, signup: signup, demoAccounts: demoAccounts,
    submitVerification: submitVerification, approveVerification: approveVerification,
    createRequest: createRequest, request: request, myRequests: myRequests, openRequests: openRequests, closeRequest: closeRequest,
    createOffer: createOffer, offer: offer, offersFor: offersFor, offersBy: offersBy, hasOffered: hasOffered,
    openThread: openThread, thread: thread, threadsOf: threadsOf, messagesOf: messagesOf,
    sendText: sendText, sendBooking: sendBooking, setBookingStatus: setBookingStatus,
    sendPrecheck: sendPrecheck, setPrecheckDone: setPrecheckDone, stageOf: stageOf, offersToUser: offersToUser
  };
})();
