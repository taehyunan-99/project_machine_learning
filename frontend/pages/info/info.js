// 팀 소개 페이지 - 최소한의 JavaScript
document.addEventListener("DOMContentLoaded", () => {
    console.log("팀 소개 페이지 로드 완료");

    // 모바일 메뉴 토글
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
            console.log('모바일 메뉴 토글');
        });

        // 메뉴 항목 클릭 시 메뉴 닫기
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
            });
        });

        // 메뉴 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                nav.classList.remove('active');
            }
        });
    }

    // 내부 링크에 부드러운 스크롤 추가
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 향후 개선 사항:
    // - JSON 파일에서 팀 데이터 로드
    // - 스크롤 시 애니메이션 추가
    // - 연락처 모달 추가
});
