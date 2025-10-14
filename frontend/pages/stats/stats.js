// API URL 설정 (환경 자동 감지)
function getApiUrl() {
    const hostname = window.location.hostname;

    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // Vercel 프로덕션 환경 - Railway 백엔드 URL
    return 'https://projectmachinelearning-production.up.railway.app';
}

const API_BASE_URL = getApiUrl();

// 차트 인스턴스
let categoryChart = null;
let dailyChart = null;
let feedbackChart = null;

// 카테고리 색상 (브랜드 컬러에 맞춤)
const CATEGORY_COLORS = {
    "캔": "#ff6384",
    "유리": "#36a2eb",
    "종이": "#ffcd56",
    "플라스틱": "#4bc0c0",
    "스티로폼": "#9966ff",
    "비닐": "#ff9f40",
};

// 현재 선택된 기간 (기본값: 7일)
let currentPeriod = 7;

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", async () => {
    setupMobileMenu();
    await loadStatistics();
    setupPeriodSelector();
});

/**
 * 서버에서 모든 통계 데이터 로드
 */
async function loadStatistics() {
    try {
        // 전체 통계 가져오기
        const statsResponse = await fetch(`${API_BASE_URL}/api/stats`);
        if (!statsResponse.ok) {
            throw new Error(`Failed to fetch stats: ${statsResponse.status}`);
        }
        const stats = await statsResponse.json();

        // 일별 통계 가져오기 (현재 기간 사용)
        const dailyResponse = await fetch(`${API_BASE_URL}/api/stats/daily?days=${currentPeriod}`);
        if (!dailyResponse.ok) {
            throw new Error(`Failed to fetch daily stats: ${dailyResponse.status}`);
        }
        const dailyStats = await dailyResponse.json();

        // 피드백 통계 가져오기
        const feedbackResponse = await fetch(`${API_BASE_URL}/api/feedback/stats`);
        if (!feedbackResponse.ok) {
            throw new Error(`Failed to fetch feedback stats: ${feedbackResponse.status}`);
        }
        const feedbackStats = await feedbackResponse.json();

        // UI 업데이트
        updateSummaryCards(stats);
        updateCategoryChart(stats.category_counts);
        updateDailyChart(dailyStats);
        updateFeedbackChart(feedbackStats);

    } catch (error) {
        console.error("Error loading statistics:", error);
        showError("통계를 불러오는 중 오류가 발생했습니다.");
    }
}

/**
 * 상단 요약 카드 업데이트
 */
function updateSummaryCards(stats) {
    // 총 분석 횟수
    document.getElementById("total-analyses").textContent =
        stats.total_analyses.toLocaleString();

    // 평균 정확도
    document.getElementById("avg-accuracy").textContent =
        `${stats.avg_accuracy}%`;

    // 최다 카테고리
    const topCategory = getTopCategory(stats.category_counts);
    document.getElementById("top-category").textContent =
        topCategory || "-";
}

/**
 * 가장 많이 탐지된 카테고리 가져오기
 */
function getTopCategory(categoryCounts) {
    if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
        return null;
    }

    let maxCount = 0;
    let topCategory = null;

    for (const [category, count] of Object.entries(categoryCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topCategory = category;
        }
    }

    return topCategory;
}

/**
 * 카테고리 분포 파이 차트 업데이트
 */
function updateCategoryChart(categoryCounts) {
    const ctx = document.getElementById("category-chart").getContext("2d");

    // 데이터 존재 여부 확인
    if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
        showEmptyState(ctx.canvas.parentElement, "아직 분석된 데이터가 없습니다");
        return;
    }

    // 데이터 준비
    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);
    const colors = labels.map(label => CATEGORY_COLORS[label] || "#cccccc");

    // 기존 차트가 있으면 제거
    if (categoryChart) {
        categoryChart.destroy();
    }

    // 파이 차트 생성
    categoryChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: "#f6f8f6",
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        padding: 20,
                        font: {
                            size: 14,
                            family: "'Public Sans', sans-serif",
                        },
                        color: "#1c1c1c",
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || "";
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value}개 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 일별 통계 막대 차트 업데이트
 */
function updateDailyChart(dailyStats) {
    const ctx = document.getElementById("daily-chart").getContext("2d");

    // 데이터 존재 여부 확인
    if (!dailyStats || dailyStats.length === 0) {
        showEmptyState(ctx.canvas.parentElement, "아직 일별 데이터가 없습니다");
        return;
    }

    // 날짜순 정렬 (오래된 것부터)
    dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 라벨 준비
    const labels = dailyStats.map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    // 기존 차트가 있으면 제거
    if (dailyChart) {
        dailyChart.destroy();
    }

    // 월별 데이터(total_analyses 포함) 또는 카테고리 데이터 확인
    const isMonthly = dailyStats[0].hasOwnProperty("total_analyses");

    let datasets;
    if (isMonthly) {
        // 한달: 전체 분석 횟수만
        datasets = [
            {
                label: "분석 횟수",
                data: dailyStats.map(item => item.total_analyses),
                backgroundColor: "rgba(17, 212, 82, 0.7)",
                borderColor: "rgba(17, 212, 82, 1)",
                borderWidth: 2,
            }
        ];
    } else {
        // 하루/일주일: 클래스별 통계
        datasets = [
            {
                label: "캔",
                data: dailyStats.map(item => item["캔"] || 0),
                backgroundColor: "rgba(255, 99, 132, 0.7)",
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 2,
            },
            {
                label: "유리",
                data: dailyStats.map(item => item["유리"] || 0),
                backgroundColor: "rgba(54, 162, 235, 0.7)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 2,
            },
            {
                label: "종이",
                data: dailyStats.map(item => item["종이"] || 0),
                backgroundColor: "rgba(255, 205, 86, 0.7)",
                borderColor: "rgba(255, 205, 86, 1)",
                borderWidth: 2,
            },
            {
                label: "플라스틱",
                data: dailyStats.map(item => item["플라스틱"] || 0),
                backgroundColor: "rgba(75, 192, 192, 0.7)",
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 2,
            },
            {
                label: "스티로폼",
                data: dailyStats.map(item => item["스티로폼"] || 0),
                backgroundColor: "rgba(153, 102, 255, 0.7)",
                borderColor: "rgba(153, 102, 255, 1)",
                borderWidth: 2,
            },
            {
                label: "비닐",
                data: dailyStats.map(item => item["비닐"] || 0),
                backgroundColor: "rgba(255, 159, 64, 0.7)",
                borderColor: "rgba(255, 159, 64, 1)",
                borderWidth: 2,
            }
        ];
    }

    // 막대 차트 생성
    dailyChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: "#1c1c1c",
                        font: {
                            family: "'Public Sans', sans-serif",
                        }
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)",
                        borderDash: [5, 5],
                    }
                },
                x: {
                    ticks: {
                        color: "#1c1c1c",
                        font: {
                            family: "'Public Sans', sans-serif",
                        }
                    },
                    grid: {
                        display: false,
                    }
                }
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        padding: 15,
                        font: {
                            size: 14,
                            family: "'Public Sans', sans-serif",
                        },
                        color: "#1c1c1c",
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || "";
                            const value = context.parsed.y || 0;
                            return `${label}: ${value}개`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 빈 상태 메시지 표시
 */
function showEmptyState(container, message) {
    container.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">inbox</span>
            <p class="empty-text">${message}</p>
        </div>
    `;
}

/**
 * 오류 메시지 표시
 */
function showError(message) {
    console.error(message);

    // 요약 카드에 오류 표시
    document.getElementById("total-analyses").textContent = "오류";
    document.getElementById("avg-accuracy").textContent = "오류";
    document.getElementById("top-category").textContent = "오류";

    // 차트에 오류 표시
    const categoryContainer = document.querySelector("#category-chart").parentElement;
    const dailyContainer = document.querySelector("#daily-chart").parentElement;

    showEmptyState(categoryContainer, message);
    showEmptyState(dailyContainer, message);
}

/**
 * 모바일 메뉴 설정
 */
function setupMobileMenu() {
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
}

/**
 * 기간 선택 버튼 설정
 */
function setupPeriodSelector() {
    const buttons = document.querySelectorAll(".period-btn");

    buttons.forEach(button => {
        button.addEventListener("click", async () => {
            // 모든 버튼에서 active 클래스 제거
            buttons.forEach(btn => btn.classList.remove("active"));

            // 클릭된 버튼에 active 클래스 추가
            button.classList.add("active");

            // 현재 기간 업데이트
            currentPeriod = parseInt(button.dataset.days);

            // 일별 통계 다시 로드
            try {
                const dailyResponse = await fetch(`${API_BASE_URL}/api/stats/daily?days=${currentPeriod}`);
                if (!dailyResponse.ok) {
                    throw new Error(`Failed to fetch daily stats: ${dailyResponse.status}`);
                }
                const dailyStats = await dailyResponse.json();
                updateDailyChart(dailyStats);
            } catch (error) {
                console.error("Error loading daily statistics:", error);
                const dailyContainer = document.querySelector("#daily-chart").parentElement;
                showEmptyState(dailyContainer, "일별 통계를 불러오는 중 오류가 발생했습니다.");
            }
        });
    });
}

/**
 * 피드백 통계 차트 업데이트 (수평 막대 차트)
 */
function updateFeedbackChart(feedbackStats) {
    const ctx = document.getElementById("feedback-chart").getContext("2d");

    // 총 피드백 수 업데이트
    document.getElementById("total-feedback").textContent =
        feedbackStats.total_feedback.toLocaleString();

    // 데이터 존재 여부 확인
    if (!feedbackStats.misclassification_rate ||
        Object.keys(feedbackStats.misclassification_rate).length === 0 ||
        feedbackStats.total_feedback === 0) {
        showEmptyState(ctx.canvas.parentElement, "아직 피드백 데이터가 없습니다");
        document.getElementById("most-confused").textContent = "-";
        return;
    }

    const misclassData = feedbackStats.misclassification_rate;

    // 오답률이 있는 카테고리만 필터링하고 정렬
    const sortedCategories = Object.entries(misclassData)
        .filter(([category, data]) => data.error_rate > 0)
        .sort((a, b) => b[1].error_rate - a[1].error_rate); // 내림차순

    // 데이터가 없으면 빈 상태 표시
    if (sortedCategories.length === 0) {
        showEmptyState(ctx.canvas.parentElement, "오분류 피드백이 없습니다 (모든 예측이 정확합니다!)");
        document.getElementById("most-confused").textContent = "없음 🎉";
        return;
    }

    // 가장 취약한 카테고리 업데이트
    const mostConfused = sortedCategories[0];
    document.getElementById("most-confused").textContent =
        `${mostConfused[0]} (${mostConfused[1].error_rate}%)`;

    // 차트 데이터 준비
    const labels = sortedCategories.map(([category]) => category);
    const errorRates = sortedCategories.map(([, data]) => data.error_rate);
    const colors = labels.map(label => CATEGORY_COLORS[label] || "#cccccc");

    // 기존 차트가 있으면 제거
    if (feedbackChart) {
        feedbackChart.destroy();
    }

    // 수평 막대 차트 생성
    feedbackChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "오답률 (%)",
                data: errorRates,
                backgroundColor: colors.map(c => c.replace(')', ', 0.7)').replace('rgb', 'rgba')),
                borderColor: colors,
                borderWidth: 2,
                barThickness: 30, // 막대 두께 고정 (기본값의 약 절반)
            }]
        },
        options: {
            indexAxis: 'y', // 수평 막대 차트
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    max: Math.max(...errorRates) * 1.2, // 여유 공간
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        color: "#1c1c1c",
                        font: {
                            family: "'Public Sans', sans-serif",
                        }
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.05)",
                        borderDash: [5, 5],
                    }
                },
                y: {
                    ticks: {
                        color: "#1c1c1c",
                        font: {
                            size: 14,
                            family: "'Public Sans', sans-serif",
                        }
                    },
                    grid: {
                        display: false,
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const category = context.label;
                            const data = misclassData[category];
                            return [
                                `오답률: ${data.error_rate}%`,
                                `오답 수: ${data.errors}개`,
                                `전체 예측: ${data.total}개`
                            ];
                        }
                    }
                }
            }
        }
    });
}
