/* =========================================================
   config.js — 서버 "주소록"
   비워 두면 시연 모드(브라우저 안에만 저장),
   Supabase 주소와 공개 키를 넣으면 서버 모드(모두가 같은 게시판)로 바뀌어요.

   어디서 찾나요? Supabase 프로젝트 → Project Settings → API (또는 Data API)
     - Project URL        → SUPABASE_URL
     - anon / public 키   → SUPABASE_ANON_KEY  (앱에 넣어도 되는 "공개용" 키예요)
   ※ service_role(비밀) 키는 절대 여기 넣지 마세요. 그 키는 운영자 열쇠예요.
   ========================================================= */
var CONFIG = {
  SUPABASE_URL: 'https://oesglfpqtvcqsskicuiy.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lc2dsZnBxdHZjcXNza2ljdWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjE2MzIsImV4cCI6MjEwNzE5NzYzMn0.WibcCr9cNCWAjkKiKy58NhqzjZdtiC_ilyvB-AwjNFk'
};
