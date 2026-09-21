# Shin's House 운영 Runbook

## 1. 배포 구조
- GitHub `main` → Netlify `shinshouse` 자동 배포
- 정적 화면은 `scripts/build-static.mjs`가 `dist/`로 생성
- API는 Netlify Functions (`/api/*`, `/api/admin/*`, `/legal/*`)
- 영구 데이터는 Supabase server-side service role 경로만 사용

## 2. 배포 전 필수 검사
```bash
npm run check
```
검사 항목: Function 문법, 정적 빌드, legacy bundle loader 제거, SEO/정책 링크, fail-safe API smoke test.

## 3. 상용 주문 활성화 조건
`COMMERCE_ENABLED=true` 전 다음을 모두 확인합니다.
1. Supabase migration 적용 완료
2. Netlify에 필수 server-only 환경변수 등록
3. 실제 사업자/통신판매/고객센터/계좌 정보 등록
4. `LEGAL_APPROVED=true` 전 정책 전문 검토 완료
5. 관리자 allowlist 및 Supabase Auth 계정 확인
6. 테스트 주문 1건 생성 → 입금확인 요청 → 관리자 상태변경 → 배송/취소 흐름 검증
7. `/api/health/ready`의 `ok=true` 확인

## 4. 장애 확인 순서
1. Netlify 최신 Deploy가 `Ready`인지 확인
2. `/api/health/ready` 응답과 `blockers` 확인
3. GitHub Actions `Shin's House CI` 최근 실행 확인
4. Netlify Function 로그에서 `api`, `admin`, `legal` 오류 확인
5. Supabase 상태 및 최근 migration/DB 오류 확인
6. 주문 장애 시 `COMMERCE_ENABLED=false`로 즉시 fail-safe 전환

## 5. 긴급 주문 차단
사이트를 내리지 않고 신규 주문만 중단하려면 Netlify Environment에서 `COMMERCE_ENABLED=false`로 변경 후 재배포합니다.
구독 신청도 중단해야 하면 `SUBSCRIPTIONS_ENABLED=false`로 변경합니다.

## 6. 롤백
- 마지막 정상 Git commit SHA를 확인합니다.
- GitHub에서 해당 커밋으로 revert PR을 생성하거나 Netlify에서 마지막 정상 Deploy를 publish합니다.
- 롤백 후 `/`, `/api/health/ready`, `/legal/terms`, 관리자 로그인 거부/허용 상태를 확인합니다.
- DB schema 변경을 수반한 장애는 코드를 먼저 롤백하고, 파괴적 DB rollback은 백업 확인 후 별도 수행합니다.

## 7. 데이터 보호/백업
- Supabase 자동 백업 제공 범위는 실제 플랜에서 확인합니다.
- 상용 오픈 전 주문/주문상세/상태이력/관리자감사로그 복구 절차를 실제로 1회 리허설합니다.
- CSV 다운로드는 운영 편의용이며 DB 백업 대체 수단으로 사용하지 않습니다.
- service-role key, 관리자 토큰, DB 비밀번호는 GitHub에 커밋하지 않습니다.

## 8. 운영 모니터링
`.github/workflows/production-health.yml`이 매시간 홈페이지, readiness, 법적 페이지를 확인합니다.
상용 오픈 후 GitHub Repository Variable `EXPECT_COMMERCE_READY=true`를 설정하면 readiness가 false일 때 workflow가 실패하도록 전환됩니다.

## 9. 출시 후 점검
- 첫 주문은 실제 고객 주문 전에 운영자 테스트 주문으로 진행
- 재고 차감/취소 복구, 중복 주문 방지, 금액 서버 재계산 확인
- 모바일 320/360/390/430px와 데스크톱에서 주문 완료까지 확인
- 개인정보/환불 문의 접수 경로 확인
- 장애 발생 시 원인/영향/조치/재발방지 내용을 운영 로그에 남김
