# Shin's House 상용화 점검

기준 저장소: `spyt611306-sys/Shins-House-Cafe`
점검 기준: 2026-09-21 `main`

## 핵심 결론
현재 화면은 상용 홈페이지 형태를 갖추고 있으나, 주문·구독·관리자 기능은 실제 서버가 아니라 브라우저 Mock API에 의존해 상용 주문을 받을 수 있는 상태가 아닙니다.

## P0 — 즉시 보완
1. 브라우저 Mock API 제거 및 서버 API 전환
2. 실제 주문/재고 영구 저장 DB 구축
3. 관리자 인증/RBAC 적용
4. 사업자/통신판매/계좌/개인정보 책임자 실정보 입력
5. 실제 약관·개인정보·배송·교환·환불 정책 확정
6. 상용 준비 완료 전 주문 성공 응답 차단

## P1 — 상용 오픈 전
1. 서버 가격 재계산, 중복 주문 방지, 재고 동시성 처리
2. 주문조회 인증/토큰 및 rate limit
3. 동의 버전/시각 저장
4. 관리자 변경 이력 및 업로드 검증
5. 모바일 주문 전 과정 점검
6. 오류/빈 상태/품절/저재고 UX
7. SEO, Open Graph, sitemap, robots, 구조화 데이터

## P2 — 운영 안정화
1. Base64/gzip 런타임 복원 구조를 일반 HTML/CSS/JS/assets로 전환
2. 이미지 CDN/반응형 이미지 최적화
3. 접근성 및 키보드 탐색
4. GitHub Actions 및 E2E 테스트
5. 오류 모니터링/알림
6. DB 백업·복구 및 배포 롤백 절차

## 분할 작업
- Issue #4: Production safety & deployment foundation
- Issue #5: Real orders, inventory & Supabase persistence
- Issue #6: Admin authentication & operations
- Issue #7: Legal notices, privacy & refund flow
- Issue #8: UX, mobile, SEO, accessibility & performance
- Issue #9: QA, CI, monitoring & launch checklist

## 상용화 기준
`COMMERCE_ENABLED=true`는 다음 조건을 모두 충족한 뒤에만 설정합니다.
- 실제 사업자/통신판매/고객센터/계좌 정보 등록
- Supabase 운영 DB와 server-only service role key 설정
- 실제 주문 생성·조회·취소·입금확인 요청 검증
- 관리자 실제 인증 검증
- 약관/개인정보/취소·교환·환불 정책 확정
- 실제 주문 1건 end-to-end 리허설 통과
