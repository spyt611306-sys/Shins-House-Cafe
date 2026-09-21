'use strict';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const env = (name, fallback = '') => process.env[name] || fallback;
const approved = () => String(process.env.LEGAL_APPROVED || 'false').toLowerCase() === 'true';
const VERSION = '2026-09-21-v1';

const business = () => ({
  name: env('BUSINESS_NAME', '신스하우스'),
  representative: env('REPRESENTATIVE_NAME', '신현수'),
  number: env('BUSINESS_NUMBER', '미등록'),
  mailOrder: env('MAIL_ORDER_NUMBER', '미등록'),
  address: env('BUSINESS_ADDRESS', '부산광역시 부산진구 새싹로8번길 35-8 1층'),
  phone: env('CUSTOMER_PHONE', '0503-5260-7479'),
  email: env('CUSTOMER_EMAIL', '미등록'),
  privacyOfficer: env('PRIVACY_OFFICER', '미등록'),
  returnAddress: env('RETURN_ADDRESS', '부산광역시 부산진구 새싹로8번길 35-8 1층 신스하우스')
});

const shell = (title, content) => {
  const b = business();
  const draft = !approved();
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${draft ? 'noindex,nofollow' : 'index,follow'}"><title>${escapeHtml(title)} | Shin's House</title><style>body{margin:0;background:#f6f1e8;color:#231b15;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.75}main{max-width:820px;margin:auto;padding:56px 24px 96px}h1,h2{font-family:Georgia,"Times New Roman",serif}h1{font-size:36px;margin:0 0 10px}h2{margin-top:42px;font-size:22px}a{color:#6d4b32}nav{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0 40px}.notice{padding:16px 18px;border:1px solid #b4845b;background:#fff8ed;border-radius:10px}.meta{font-size:13px;opacity:.7}.box{padding:18px;border:1px solid #d9ccbd;border-radius:10px;background:#fffaf3}ul{padding-left:22px}footer{margin-top:64px;padding-top:24px;border-top:1px solid #d9ccbd;font-size:13px;color:#65564a}</style></head><body><main><header><div class="meta">SHIN'S HOUSE · POLICY ${VERSION}</div><h1>${escapeHtml(title)}</h1><nav><a href="/">홈</a><a href="/legal/terms">이용약관</a><a href="/legal/privacy">개인정보처리방침</a><a href="/legal/refund">취소·교환·환불</a></nav>${draft ? '<div class="notice"><strong>상용화 준비 중</strong><br>현재 정책은 운영 검토용 초안입니다. 실제 사업자 정보·수탁업체·정책 검토가 완료되기 전에는 상용 주문을 활성화하지 않습니다.</div>' : ''}</header>${content}<footer><strong>${escapeHtml(b.name)}</strong> · 대표 ${escapeHtml(b.representative)}<br>사업자등록번호 ${escapeHtml(b.number)} · 통신판매업 신고번호 ${escapeHtml(b.mailOrder)}<br>${escapeHtml(b.address)} · ${escapeHtml(b.phone)} · ${escapeHtml(b.email)}<br>개인정보 보호책임자 ${escapeHtml(b.privacyOfficer)}</footer></main></body></html>`;
};

const terms = () => shell('이용약관 및 주문계약 안내', `
<section><h2>1. 운영자 정보</h2><div class="box">본 사이트의 판매자 정보는 페이지 하단에 표시합니다. 상호·대표자·주소·연락처·사업자등록번호·통신판매업 신고정보가 실제 등록정보와 일치하는지 주문 활성화 전에 확인합니다.</div></section>
<section><h2>2. 주문 및 계약</h2><p>고객은 상품, 수량, 판매가격, 배송비, 배송정보 및 필수 정책을 확인한 뒤 주문을 신청합니다. 무통장입금 주문의 접수와 입금 확인, 상품 준비 및 배송 상태는 주문조회 화면을 통해 확인할 수 있도록 운영합니다.</p><p>재고 부족, 표시 오류, 시스템 장애 등으로 주문을 이행하기 어려운 경우 판매자는 고객에게 알리고 관련 법령과 실제 결제·입금 상태에 따라 취소 또는 환급 절차를 진행합니다.</p></section>
<section><h2>3. 가격·결제·배송</h2><p>최종 결제금액은 상품금액과 주문 시 표시된 배송비를 합산한 금액입니다. 서버에 저장된 상품가격을 기준으로 주문금액을 다시 계산합니다. 배송 일정은 입금 확인, 재고, 도서산간지역, 택배사 사정, 연휴 등에 따라 달라질 수 있습니다.</p></section>
<section><h2>4. 청약철회·교환·환불</h2><p>청약철회 및 그 제한, 교환·환불과 비용 부담은 전자상거래 관련 법령과 별도 <a href="/legal/refund">취소·교환·환불 안내</a>에 따릅니다. 표시·광고 내용 또는 계약내용과 다르게 이행된 경우에는 법정 기준이 우선합니다.</p></section>
<section><h2>5. 주문기록</h2><p>거래 관련 기록은 관계 법령에서 정한 기간 동안 보존할 수 있으며, 고객이 자신의 거래기록을 확인할 수 있는 주문조회 방법을 제공합니다.</p></section>
<section><h2>6. 문의 및 분쟁</h2><p>상품·배송·환불 관련 문의는 사이트 하단 고객센터 연락처로 접수합니다. 본 안내와 관계 법령이 충돌하는 경우 관계 법령이 우선합니다.</p></section>`);

const privacy = () => {
  const b = business();
  return shell('개인정보처리방침', `
<section><h2>1. 처리 목적과 항목</h2><div class="box"><strong>주문·배송·고객응대</strong><br>필수: 이름, 휴대전화번호, 배송주소, 주문상품·수량·금액, 주문상태, 동의기록<br>선택: 배송 요청사항, 상담내용<br><br><strong>신청형 구독 상담</strong><br>이름, 휴대전화번호, 선택한 구독 플랜, 상담 메모</div></section>
<section><h2>2. 보유기간</h2><ul><li>계약 또는 청약철회 관련 기록: 5년</li><li>대금결제 및 재화 공급 관련 기록: 5년</li><li>소비자 불만 또는 분쟁처리 관련 기록: 3년</li><li>표시·광고 관련 기록: 6개월</li></ul><p>법정 보존의무가 없는 개인정보는 처리 목적 달성 후 지체 없이 파기하는 것을 원칙으로 합니다.</p></section>
<section><h2>3. 처리위탁 및 국외 처리</h2><p>호스팅·데이터베이스·배송 등 외부 서비스를 사용하는 경우 실제 수탁자, 업무내용, 처리 위치와 필요한 고지사항을 운영 전 확정하여 이 방침에 반영합니다. 현재 미확정 항목이 있으면 상용 주문을 활성화하지 않습니다.</p></section>
<section><h2>4. 안전조치</h2><p>운영 데이터는 브라우저 Mock 데이터가 아닌 서버와 접근통제가 적용된 데이터베이스에 저장하고, 관리자 인증과 권한검증, 접근기록, 비밀키 분리, 전송구간 암호화를 적용합니다.</p></section>
<section><h2>5. 정보주체의 권리</h2><p>고객은 자신의 개인정보에 대한 열람·정정·삭제·처리정지 등 법령상 권리를 행사할 수 있습니다. 다만 거래기록처럼 관계 법령에 따라 보존해야 하는 항목은 해당 기간 동안 보존될 수 있습니다.</p></section>
<section><h2>6. 개인정보 보호책임자</h2><div class="box">책임자: ${escapeHtml(b.privacyOfficer)}<br>문의: ${escapeHtml(b.email)} / ${escapeHtml(b.phone)}</div></section>
<section><h2>7. 변경</h2><p>방침을 변경할 경우 시행일과 변경내용을 사이트에서 알립니다. 현재 버전: ${VERSION}</p></section>`);
};

const refund = () => {
  const b = business();
  return shell('취소·교환·환불 안내', `
<section><h2>1. 주문 취소</h2><p>미입금·입금대기 단계에서 시스템이 허용하는 경우 주문조회에서 직접 취소할 수 있습니다. 입금 확인 이후에는 상품 준비·배송 여부를 확인해야 하므로 고객센터를 통해 처리합니다.</p></section>
<section><h2>2. 청약철회 기본기준</h2><p>통신판매의 청약철회는 원칙적으로 계약내용에 관한 서면을 받은 날부터 7일 이내이며, 재화 공급이 더 늦은 경우에는 재화를 공급받거나 공급이 시작된 날부터 7일을 기준으로 합니다. 법령에서 정한 예외가 적용될 수 있습니다.</p></section>
<section><h2>3. 제한될 수 있는 경우</h2><ul><li>고객 책임으로 상품이 멸실·훼손된 경우(내용 확인을 위한 포장 훼손은 별도 판단)</li><li>사용 또는 일부 소비로 상품 가치가 현저히 감소한 경우</li><li>시간 경과로 다시 판매하기 곤란할 정도로 가치가 현저히 감소한 경우</li><li>그 밖에 관계 법령에서 정한 제한사유가 있는 경우</li></ul><p>원두 등 식품도 일률적으로 환불 불가로 처리하지 않고, 상품 상태와 법정 기준을 확인해 처리합니다.</p></section>
<section><h2>4. 표시·광고 또는 계약과 다른 경우</h2><p>상품이 표시·광고 내용 또는 계약내용과 다르게 공급된 경우에는 일반적인 단순변심 기준과 별도로 관계 법령의 청약철회 기준이 적용됩니다.</p></section>
<section><h2>5. 비용 부담</h2><p>단순변심에 따른 반환비용과 판매자 귀책에 따른 반환비용은 관계 법령과 주문 당시 고지내용에 따라 처리합니다. 환급 시점 역시 실제 입금·반품·상품상태를 확인한 뒤 법정 기준에 맞춰 처리합니다.</p></section>
<section><h2>6. 반품처 및 문의</h2><div class="box">반품처: ${escapeHtml(b.returnAddress)}<br>문의: ${escapeHtml(b.phone)} / ${escapeHtml(b.email)}</div></section>`);
};

exports.handler = async (event) => {
  const route = String(event.queryStringParameters?.route || '').replace(/^\/+|\/+$/g, '');
  const pages = { terms, privacy, refund };
  if (!pages[route]) return { statusCode: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: 'Not found' };
  return {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': approved() ? 'public, max-age=3600' : 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY'
    },
    body: pages[route]()
  };
};
