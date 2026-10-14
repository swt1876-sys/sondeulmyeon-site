/* =========================================================
   server.js — 공용 창고(Supabase 서버)와 앱 창고(store.js)를 맞추는 "택배 기사"

   비유
   - 앱 창고(store.js): 내 휴대폰 안의 작은 진열대. 화면은 여기서만 물건을 꺼내 보여 줘요.
   - 공용 창고(서버): 모든 사용자가 함께 쓰는 큰 창고. 자물쇠(RLS)가 있어서
     각자 볼 수 있는 물건만 내어 줘요.
   - 택배 기사(이 파일):
       ① 내가 진열대에 물건을 올리면 → 공용 창고로 배달 (write)
       ② 공용 창고에 새 물건이 들어오면 → 내 진열대를 통째로 새로 채움 (refresh)
   js/config.js가 비어 있으면 이 파일은 아무 일도 하지 않아요(시연 모드).
   ========================================================= */

var Server = (function () {
  var C = window.CONFIG || {};
  var broken = !window.CONFIG;          // config.js에 오타가 있으면 CONFIG가 아예 안 만들어짐
  var on = broken || !!(C.SUPABASE_URL || C.SUPABASE_ANON_KEY);
  var sb = null, session = null, ready = !on, listeners = [];
  var queue = Promise.resolve();       // 배달은 한 줄로 차례차례 (순서가 바뀌지 않게)
  var refreshTimer = null, channel = null;

  function enabled() { return on; }
  function isReady() { return ready; }
  function hasSession() { return !!session; }
  function email() { return session && session.user ? session.user.email : ''; }
  function userId() { return session && session.user ? session.user.id : ''; }
  function onChange(fn) { listeners.push(fn); }
  function notify(background) { listeners.forEach(function (fn) { fn(background); }); }
  function fail(msg, err) {
    if (window.console) console.warn('[server]', msg, err);
    if (window.UI) UI.toast(msg);
  }
  function check(res) { if (res && res.error) throw res.error; return res ? res.data : null; }
  /* 새로 추가된 선반(신고·차단)은 SQL을 아직 안 돌렸어도 앱이 멈추지 않게, 오류면 빈 목록으로 */
  function soft(q) { return q.then(function (x) { return x && !x.error ? (x.data || []) : []; }, function () { return []; }); }

  /* ---------- 서버 → 앱: 내가 볼 수 있는 것 전부 받아 와서 진열대 교체 ---------- */
  function fetchAll() {
    var uid = session.user.id;
    return Promise.all([
      sb.from('profiles').select('*'),
      sb.from('banker_verifications').select('*'),
      sb.from('requests').select('*').order('created_at', { ascending: false }),
      sb.from('request_private').select('*'),
      sb.from('offers').select('*').order('created_at', { ascending: true }),
      sb.from('threads').select('*'),
      sb.from('messages').select('*').order('created_at', { ascending: true }),
      sb.rpc('offer_counts'),
      // 운영자 명부 (admin.sql을 아직 안 돌렸으면 오류가 나므로, 오류면 "운영자 아님"으로 처리)
      sb.from('admins').select('user_id').then(function (x) { return x; }, function () { return { data: [] }; }),
      soft(sb.from('blocks').select('*')),
      soft(sb.rpc('my_blocked_threads')),
      soft(sb.from('reports').select('*').order('created_at', { ascending: false }))
    ]).then(function (r) {
      var profiles = check(r[0]) || [], verifs = check(r[1]) || [], reqs = check(r[2]) || [],
          privs = check(r[3]) || [], offers = check(r[4]) || [], threads = check(r[5]) || [],
          msgs = check(r[6]) || [], counts = check(r[7]) || [];
      var vById = {}; verifs.forEach(function (v) { vById[v.user_id] = v; });
      var pById = {}; privs.forEach(function (p) { pById[p.request_id] = p; });
      var countMap = {}; counts.forEach(function (c) { countMap[c.request_id] = c.n; });
      var adminRows = (r[8] && !r[8].error && r[8].data) || [];
      var isAdmin = adminRows.some(function (a) { return a.user_id === uid; });
      return {
        isAdmin: isAdmin,
        // 운영자만: 모든 재직 인증 신청서 (운영자가 아니면 내 것 하나뿐이라 쓰지 않음)
        verifications: isAdmin ? verifs.map(function (v) {
          return { userId: v.user_id, email: v.email, filePath: v.file_path, fileName: v.file_name, policyOk: v.policy_ok,
                   status: v.status, rejectReason: v.reject_reason || '', submittedAt: v.submitted_at, reviewedAt: v.reviewed_at };
        }) : [],
        currentUserId: profiles.some(function (p) { return p.id === uid; }) ? uid : null,
        users: profiles.map(function (p) { return toUser(p, vById[p.id], p.id === uid); }),
        requests: reqs.map(function (q) { return toRequest(q, pById[q.id]); }),
        offers: offers.map(toOffer),
        threads: threads.map(toThread),
        messages: msgs.map(toMessage),
        offerCounts: countMap,
        blockList: r[9].map(function (b) { return { blocker: b.blocker_id, blocked: b.blocked_id, createdAt: b.created_at }; }),
        blockedThreads: r[10].map(function (x) { return x.thread_id; }),
        // 운영자만 모든 신고를 받음 (일반 회원은 화면에 신고 목록을 보여 주지 않음)
        reports: isAdmin ? r[11].map(function (x) {
          return { id: x.id, reporterId: x.reporter_id, targetId: x.target_id, kind: x.kind, refId: x.ref_id, reason: x.reason,
                   detail: x.detail, snapshot: x.snapshot, status: x.status, adminNote: x.admin_note, createdAt: x.created_at, resolvedAt: x.resolved_at };
        }) : []
      };
    });
  }

  function toUser(p, v, mine) {
    var u = { id: p.id, role: p.role, name: p.name, phone: p.phone || '', title: p.title || '', consents: p.consents || {} };
    if (p.role === 'banker') {
      u.banker = { org: p.org || '', branch: p.branch || '',
                   // 다른 직원의 인증 정보는 안 보이지만, 제안을 보낼 수 있었다면 인증된 직원이에요
                   status: v ? v.status : (mine ? 'none' : 'verified'),
                   email: v ? v.email : '', fileName: v ? v.file_name : '', policyOk: v ? v.policy_ok : false,
                   rejectReason: v ? (v.reject_reason || '') : '' };
    }
    return u;
  }
  function toRequest(q, priv) {
    return { id: q.id, userId: q.user_id, purpose: q.purpose, amount: q.amount, term: q.term, repay: q.repay, rate: q.rate,
             employ: q.employ, income: q.income, debt: q.debt, sido: q.sido, sgg: q.sgg,
             dong: priv ? priv.dong : '', late: priv ? priv.late : '', status: q.status, createdAt: q.created_at };
  }
  function toOffer(o) {
    return { id: o.id, requestId: o.request_id, bankerId: o.banker_id, product: o.product, rate: o.rate,
             limit: o.limit_amount, term: o.term, alt: o.alt, memo: o.memo, createdAt: o.created_at };
  }
  function toThread(t) {
    return { id: t.id, offerId: t.offer_id, requestId: t.request_id, borrowerId: t.borrower_id, bankerId: t.banker_id, createdAt: t.created_at };
  }
  function toMessage(m) {
    return { id: m.id, threadId: m.thread_id, from: m.from_id || 'system', type: m.type, text: m.text,
             booking: m.booking || undefined, precheck: m.precheck || undefined, createdAt: m.created_at };
  }
  function emptyDb() { return { currentUserId: null, users: [], requests: [], offers: [], threads: [], messages: [], offerCounts: {},
                                blockList: [], blockedThreads: [], reports: [] }; }

  function refresh(background) {
    queue = queue.then(function () {
      if (!session) { Store.replaceAll(emptyDb()); return; }
      return fetchAll().then(function (next) { Store.replaceAll(next); });
    }).catch(function (err) { fail('서버에서 내용을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.', err); })
      .then(function () { ready = true; notify(background); });
    return queue;
  }
  /* 새 소식이 몰려와도 0.4초에 한 번만 새로 받기 */
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { refresh(true); }, 400);
  }

  /* ---------- 앱 → 서버: 진열대에 올린 것을 공용 창고로 배달 ---------- */
  function deliver(kind, d) {
    queue = queue.then(function () { return send(kind, d); })
      .catch(function (err) {
        fail('저장하지 못했어요. 잠시 후 다시 시도해 주세요.', err);
        scheduleRefresh();   // 서버 기준으로 되돌림
      });
  }

  function send(kind, d) {
    var uid = session.user.id;
    switch (kind) {
      case 'profile':
        return sb.from('profiles').insert({ id: d.id, role: d.role, name: d.name, phone: d.phone || '', consents: d.consents || {} }).then(check);
      case 'verification':
        var u = d.user, b = u.banker, file = d.file, path = '';
        var upload = Promise.resolve();
        if (file && file.name) {
          // 저장소는 파일 이름에 한글·공백을 받지 않아서, 영문·숫자 이름으로 바꿔 저장 (원래 이름은 file_name에 기록)
          var ext = (file.name.match(/\.([a-z0-9]{1,5})$/i) || ['', 'bin'])[1].toLowerCase();
          path = uid + '/' + Date.now() + '-proof.' + ext;
          upload = sb.storage.from('verification-docs').upload(path, file).then(check);
        }
        return upload.then(function () {
          return sb.from('profiles').update({ title: u.title || '', org: b.org, branch: b.branch }).eq('id', uid).then(check);
        }).then(function () {
          return sb.from('banker_verifications').upsert({ user_id: uid, email: b.email, file_path: path, file_name: b.fileName || '',
                                                          policy_ok: !!b.policyOk, status: 'pending', reject_reason: '', submitted_at: new Date().toISOString() }).then(check);
        });
      case 'request':
        return sb.from('requests').insert({ id: d.id, user_id: d.userId, purpose: d.purpose, amount: d.amount, term: d.term,
            repay: d.repay || '', rate: d.rate || '', employ: d.employ, income: d.income, debt: d.debt,
            sido: d.sido, sgg: d.sgg || '' }).then(check)
          .then(function () { return sb.from('request_private').insert({ request_id: d.id, dong: d.dong || '', late: d.late || '' }).then(check); });
      case 'closeRequest':
        return sb.from('requests').update({ status: 'closed' }).eq('id', d.id).then(check);
      case 'offer':
        return sb.from('offers').insert({ id: d.id, request_id: d.requestId, banker_id: d.bankerId, product: d.product, rate: d.rate,
                                          limit_amount: d.limit, term: d.term, alt: d.alt || '', memo: d.memo || '' }).then(check);
      case 'thread':
        var t = d.thread;
        return sb.from('threads').insert({ id: t.id, offer_id: t.offerId, request_id: t.requestId, borrower_id: t.borrowerId, banker_id: t.bankerId }).then(check)
          .then(function () { return send('message', d.message); });
      case 'message':
        return sb.from('messages').insert({ id: d.id, thread_id: d.threadId, from_id: d.from === 'system' ? null : d.from,
                                            type: d.type, text: d.text || '', booking: d.booking || null, precheck: d.precheck || null }).then(check);
      case 'review':   // 운영자의 승인·반려
        return sb.from('banker_verifications').update({ status: d.status, reject_reason: d.reason || '', reviewed_at: new Date().toISOString() })
          .eq('user_id', d.userId).then(check);
      case 'block':
        return sb.from('blocks').insert({ blocker_id: uid, blocked_id: d.blocked }).then(check);
      case 'unblock':
        return sb.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', d.blocked).then(check);
      case 'report':
        return sb.from('reports').insert({ id: d.id, reporter_id: uid, target_id: d.targetId || null, kind: d.kind, ref_id: d.refId,
                                           reason: d.reason, detail: d.detail || '', snapshot: d.snapshot || '' }).then(check);
      case 'resolveReport':   // 운영자의 신고 처리
        return sb.from('reports').update({ status: 'resolved', admin_note: d.adminNote || '', resolved_at: new Date().toISOString() })
          .eq('id', d.id).then(check);
      case 'messageUpdate':
        return sb.from('messages').update({ booking: d.booking || null, precheck: d.precheck || null }).eq('id', d.id).then(check);
    }
    return Promise.resolve();
  }

  /* 운영자용: 증빙 파일을 5분짜리 임시 주소로 열기 (비공개 보관함이라 주소가 있어야 볼 수 있음) */
  var signed = {};
  function docUrl(path) { return signed[path] || ''; }
  function loadDocUrls(paths, done) {
    var need = paths.filter(function (p) { return p && !signed[p]; });
    if (!need.length || !sb) return;
    Promise.all(need.map(function (p) {
      return sb.storage.from('verification-docs').createSignedUrl(p, 600).then(function (res) {
        if (res && res.data && res.data.signedUrl) signed[p] = res.data.signedUrl; else signed[p] = 'error';
      }, function () { signed[p] = 'error'; });
    })).then(done);
  }

  /* ---------- 로그인: 이메일로 6자리 인증번호 ---------- */
  function sendCode(addr) {
    return sb.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: true } }).then(check);
  }
  function verifyCode(addr, code) {
    return sb.auth.verifyOtp({ email: addr, token: code, type: 'email' }).then(check);
  }
  /* 스토어 심사용 계정 로그인 (운영자가 Supabase에서 비밀번호로 만든 계정만) */
  function signInPassword(addr, pw) {
    return sb.auth.signInWithPassword({ email: addr, password: pw }).then(check);
  }
  function signOut() { return sb.auth.signOut(); }
  /* 회원 탈퇴: 서버에서 내 계정과 데이터를 모두 지운 뒤 로그아웃 */
  function deleteAccount() {
    // ① 내가 올린 재직 증빙 파일부터 보관함에서 지우고 → ② 계정과 데이터 삭제 → ③ 로그아웃
    var uid = session.user.id, box = sb.storage.from('verification-docs');
    return box.list(uid).then(function (res) {
      var names = (res && res.data) ? res.data.map(function (f) { return uid + '/' + f.name; }) : [];
      return names.length ? box.remove(names).then(check) : null;
    }).then(function () { return sb.rpc('delete_my_account'); }).then(check)
      .then(function () { return sb.auth.signOut(); });
  }

  /* 실시간: 공용 창고에 변화가 생기면 알려 달라고 등록 */
  function subscribe() {
    if (channel) sb.removeChannel(channel);
    channel = null;
    if (!session) return;
    channel = sb.channel('sondeul-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, scheduleRefresh)
      .subscribe();
  }

  function start() {
    if (!on) return;
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('서버 연결 도구(supabase-js)를 내려받지 못했어요. 인터넷 연결을 확인해 주세요. ' +
                      '회사 PC라면 보안 프로그램이 cdn.jsdelivr.net을 막고 있을 수 있어요(개인 PC나 휴대폰으로 시도해 보세요).');
    }
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    Store.attachRemote(deliver);
    Store.replaceAll(emptyDb());
    sb.auth.onAuthStateChange(function (event, s) {
      var changed = (s && s.user && s.user.id) !== (session && session.user && session.user.id);
      session = s;
      if (changed) { subscribe(); refresh(false); }
    });
    sb.auth.getSession().then(function (r) {
      session = r.data ? r.data.session : null;
      subscribe(); return refresh(false);
    });
    // 앱을 다시 열었을 때도 최신 내용으로
    document.addEventListener('visibilitychange', function () { if (!document.hidden && session) scheduleRefresh(); });
  }

  /* 주소록(config.js) 점검: 흔한 실수를 사람이 읽을 수 있는 말로 알려 줌 */
  var setupError = '';
  function checkConfig() {
    var url = String(C.SUPABASE_URL || '').trim(), key = String(C.SUPABASE_ANON_KEY || '').trim();
    if (!url) return 'SUPABASE_URL(창고 주소)이 비어 있어요.';
    if (!key) return 'SUPABASE_ANON_KEY(anon 키)가 비어 있어요.';
    C.SUPABASE_URL = url.replace(/\/+$/, '').replace(/\/rest\/v1$/, ''); C.SUPABASE_ANON_KEY = key;
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(C.SUPABASE_URL))
      return 'SUPABASE_URL 형식이 달라요. https://(영문자).supabase.co 모양이어야 해요. 지금 값: ' + url.slice(0, 60);
    if (/^sb_secret_/.test(key)) return '비밀(secret) 키를 넣었어요! 앱에는 anon(공개) 키만 넣어야 해요. Supabase에서 이 비밀 키를 즉시 새로 발급(교체)해 주세요.';
    if (/^eyJ/.test(key)) {
      try {
        var payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role === 'service_role') return 'service_role(마스터) 키를 넣었어요! 앱에는 anon 키만 넣어야 해요. Supabase에서 마스터 키를 즉시 새로 발급(교체)해 주세요.';
      } catch (e) { return 'SUPABASE_ANON_KEY가 중간에 잘린 것 같아요. 복사 버튼으로 다시 복사해 주세요.'; }
      return '';
    }
    if (/^sb_publishable_/.test(key)) return '';
    return 'SUPABASE_ANON_KEY 형식이 달라요. eyJ로 시작하는 anon 키를 넣어 주세요.';
  }

  if (on) {
    setupError = broken ? 'js/config.js에 오타가 있어요. 따옴표(\')나 쉼표(,)가 빠지지 않았는지 확인해 주세요. ' +
                          '모양: SUPABASE_URL: \'주소\',  ← 끝에 쉼표 / SUPABASE_ANON_KEY: \'키\''
                        : checkConfig();
    if (!setupError) {
      try { start(); }
      catch (err) { setupError = (err && err.message ? err.message : String(err)); }
    }
    if (setupError) ready = true;
  }
  function error() { return setupError; }

  return { error: error, docUrl: docUrl, loadDocUrls: loadDocUrls, enabled: enabled, isReady: isReady, hasSession: hasSession, email: email, userId: userId, onChange: onChange,
           refresh: refresh, signInPassword: signInPassword, sendCode: sendCode, verifyCode: verifyCode, signOut: signOut, deleteAccount: deleteAccount };
})();
