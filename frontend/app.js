// API URL 설정 (환경 자동 감지)
function getApiUrl() {
    const hostname = window.location.hostname;

    // 로컬 개발 환경
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        return "http://localhost:8000";
    }

    // Vercel 프로덕션 환경 - Railway 백엔드 URL
    return "https://projectmachinelearning-production.up.railway.app";
}

const API_BASE_URL = getApiUrl();

// DOM 요소 선택
const imageUploadInput = document.getElementById("image-upload");
const realtimeBtn = document.getElementById("realtime-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const inputArea = document.getElementById("input-area");
const uploadPrompt = document.getElementById("upload-prompt");
const imagePreviewContainer = document.getElementById(
    "image-preview-container"
);
const cameraFeedContainer = document.getElementById("camera-feed-container");
const resultsSection = document.getElementById("results-section");
const homeLogo = document.getElementById("home-logo");

// 모바일 메뉴 설정
const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const nav = document.querySelector(".nav");

if (mobileMenuBtn && nav) {
    mobileMenuBtn.addEventListener("click", () => {
        nav.classList.toggle("active");
        console.log("모바일 메뉴 토글");
    });

    // 메뉴 항목 클릭 시 메뉴 닫기
    nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            nav.classList.remove("active");
        });
    });

    // 메뉴 외부 클릭 시 닫기
    document.addEventListener("click", (e) => {
        if (!nav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            nav.classList.remove("active");
        }
    });
}

// 홈 로고 클릭 이벤트 - 페이지 초기화
homeLogo.addEventListener("click", (event) => {
    event.preventDefault();
    // 이미지 업로드 초기화
    imageUploadInput.value = "";
    imagePreviewContainer.style.backgroundImage = "";
    // UI 초기화
    uploadPrompt.classList.remove("hidden");
    imagePreviewContainer.classList.add("hidden");
    cameraFeedContainer.classList.add("hidden");
    resultsSection.classList.add("hidden");
    mapSection.classList.add("hidden");
    inputArea.classList.remove("has-image");

    // 지도 초기화
    getLocationBtn.style.display = "inline-flex";
    locationInfo.classList.add("hidden");
    document.getElementById("map").classList.add("hidden");
    if (map) {
        map.remove();
        map = null;
    }

    // 페이지 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// 이미지 업로드 이벤트
imageUploadInput.addEventListener("change", (event) => {
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreviewContainer.style.backgroundImage = `url('${e.target.result}')`;
            uploadPrompt.classList.add("hidden");
            cameraFeedContainer.classList.add("hidden");
            imagePreviewContainer.classList.remove("hidden");
            inputArea.classList.remove("image-preview-placeholder");
            inputArea.classList.add("has-image");

            // 결과와 지도 초기화
            resultsSection.classList.add("hidden");
            mapSection.classList.add("hidden");

            // 지도 버튼 초기화
            getLocationBtn.style.display = "inline-flex";
            locationInfo.classList.add("hidden");
            document.getElementById("map").classList.add("hidden");
            if (map) {
                map.remove();
                map = null;
            }
        };
        reader.readAsDataURL(event.target.files[0]);
    }
});

// ===== 실시간 인식 기능 =====

// 추가 DOM 요소
const webcamVideo = document.getElementById("webcam-video");
const overlayCanvas = document.getElementById("overlay-canvas");
const buttonGroup = document.querySelector(".button-group");
const realtimeControls = document.getElementById("realtime-controls");
const speedSlider = document.getElementById("speed-slider");
const speedValue = document.getElementById("speed-value");
const realtimeHistory = document.getElementById("realtime-history");
const detectionHistory = document.getElementById("detection-history");

// 실시간 인식 상태 변수
let isRealtimeActive = false;
let realtimeStream = null;
let analysisInterval = null;
let lastAnalysisTime = 0;
let analysisSpeed = 1000; // 기본 1초

// 히스토리 변수
let detectionHistoryList = [];

// 실시간 인식 버튼
realtimeBtn.addEventListener("click", async () => {
    if (!isRealtimeActive) {
        // 실시간 모드 시작
        await startRealtimeMode();
    } else {
        // 실시간 모드 종료
        stopRealtimeMode();
    }
});

// 분석 실행 버튼
analyzeBtn.addEventListener("click", async () => {
    // 파일이 업로드되었는지 확인
    const file = imageUploadInput.files[0];
    if (!file) {
        alert("먼저 이미지를 업로드해주세요.");
        return;
    }

    // FormData 생성
    const formData = new FormData();
    formData.append("file", file);

    try {
        // API 호출
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log("분석 결과:", result);

        // 결과 표시
        displayResults(result);
        resultsSection.classList.remove("hidden");

        // 결과 섹션으로 스크롤
        setTimeout(() => {
            resultsSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 100);

        // 서버에 통계 데이터 저장 (분류된 항목이 있을 때만)
        if (result.classified_items > 0) {
            saveAnalysisToServer(result);
        }
    } catch (error) {
        console.error("분석 중 오류:", error);
        alert("분석 중 오류가 발생했습니다: " + error.message);
    }
});

// 결과 표시 함수
function displayResults(apiResponse) {
    const resultsCard = document.querySelector(".results-card");

    if (apiResponse.classified_items === 0) {
        // 탐지된 객체 없음
        resultsCard.innerHTML = `
            <div class="result-header no-results">
                <span class="result-icon">🔍</span>
                <div class="result-text">
                    <p class="result-label">재활용품을 찾을 수 없습니다</p>
                    <p class="result-description">다른 각도에서 촬영하거나 더 선명한 이미지를 업로드해주세요.</p>
                </div>
            </div>
        `;
        return;
    }

    // 다중 객체 결과 표시
    let resultsHTML = `<h3 class="results-title">${apiResponse.summary}</h3>`;

    apiResponse.recycling_items.forEach((item, index) => {
        const category = item.recycling_info.category;
        const confidence = (item.recycling_info.confidence * 100).toFixed(0);
        const method = item.recycling_info.recycling_method;
        const actualConfidence = item.recycling_info.confidence;

        resultsHTML += `
            <div class="result-item" data-index="${index}">
                <div class="result-header">
                    <span class="result-icon">♻️</span>
                    <div>
                        <p class="result-label">${category} (${confidence}%)</p>
                        <p class="result-status">재활용 가능</p>
                    </div>
                    <div class="button-section">
                        <button class="method-toggle-btn" data-index="${index}">
                            <span class="material-symbols-outlined">info</span>
                            <span>배출 방법 보기</span>
                        </button>
                        <button class="feedback-btn" data-category="${category}" data-confidence="${actualConfidence}">
                            <span class="material-symbols-outlined">report</span>
                            <span>결과가 잘못되었나요?</span>
                        </button>
                    </div>
                </div>
                <p class="result-description hidden" id="method-${index}">${method}</p>
            </div>
            ${
                index < apiResponse.recycling_items.length - 1
                    ? '<hr class="result-divider">'
                    : ""
            }
        `;
    });

    resultsCard.innerHTML = resultsHTML;

    // 배출 방법 토글 버튼 이벤트 리스너
    document.querySelectorAll(".method-toggle-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const index = btn.dataset.index;
            const methodText = document.getElementById(`method-${index}`);
            const isHidden = methodText.classList.contains("hidden");

            if (isHidden) {
                methodText.classList.remove("hidden");
                btn.innerHTML =
                    '<span class="material-symbols-outlined">close</span><span>배출 방법 닫기</span>';
            } else {
                methodText.classList.add("hidden");
                btn.innerHTML =
                    '<span class="material-symbols-outlined">info</span><span>배출 방법 보기</span>';
            }
        });
    });

    // 피드백 버튼 이벤트 리스너 추가
    document.querySelectorAll(".feedback-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const predictedClass = btn.dataset.category;
            const confidence = parseFloat(btn.dataset.confidence);
            showFeedbackModal(predictedClass, confidence, btn);
        });
    });
}

// 드래그 앤 드롭 기능
inputArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    inputArea.classList.add("drag-over");
});

inputArea.addEventListener("dragleave", (event) => {
    event.preventDefault();
    inputArea.classList.remove("drag-over");
});

inputArea.addEventListener("drop", (event) => {
    event.preventDefault();
    inputArea.classList.remove("drag-over");
    const files = event.dataTransfer.files;
    if (files && files[0]) {
        imageUploadInput.files = files;
        const changeEvent = new Event("change");
        imageUploadInput.dispatchEvent(changeEvent);
    }
});

// ===== 실시간 인식 함수들 =====

// 실시간 모드 시작
async function startRealtimeMode() {
    try {
        // 웹캠 접근 요청
        realtimeStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }, // 후면 카메라 우선
            audio: false,
        });

        // video 요소에 스트림 연결
        webcamVideo.srcObject = realtimeStream;

        // UI 전환
        uploadPrompt.classList.add("hidden");
        imagePreviewContainer.classList.add("hidden");
        cameraFeedContainer.classList.remove("hidden");
        resultsSection.classList.add("hidden");
        mapSection.classList.add("hidden");
        realtimeHistory.classList.remove("hidden");

        // 클래스 추가 (클릭 방지)
        inputArea.classList.add("realtime-active");
        buttonGroup.classList.add("realtime-active");

        // 컨트롤 표시
        realtimeControls.classList.remove("hidden");

        // 버튼 텍스트 변경
        realtimeBtn.innerHTML =
            '<span class="material-symbols-outlined">stop_circle</span>실시간 인식 중지';

        // 상태 변경 및 히스토리 초기화
        isRealtimeActive = true;
        detectionHistoryList = [];
        renderHistory();

        // Canvas 크기 설정
        webcamVideo.addEventListener("loadedmetadata", () => {
            overlayCanvas.width = webcamVideo.videoWidth;
            overlayCanvas.height = webcamVideo.videoHeight;
        });

        // 자동 분석 시작
        startAnalysisLoop();
    } catch (error) {
        console.error("웹캠 접근 오류:", error);
        alert("웹캠에 접근할 수 없습니다. 권한을 확인해주세요.");
    }
}

// 실시간 모드 종료
function stopRealtimeMode() {
    // 스트림 종료
    if (realtimeStream) {
        realtimeStream.getTracks().forEach((track) => track.stop());
        realtimeStream = null;
    }

    // 분석 루프 종료
    if (analysisInterval) {
        clearInterval(analysisInterval);
        analysisInterval = null;
    }

    // UI 복원
    cameraFeedContainer.classList.add("hidden");
    uploadPrompt.classList.remove("hidden");
    realtimeControls.classList.add("hidden");
    realtimeHistory.classList.add("hidden");

    inputArea.classList.remove("realtime-active");
    inputArea.classList.remove("has-image");
    buttonGroup.classList.remove("realtime-active");

    // 버튼 텍스트 복원
    realtimeBtn.innerHTML =
        '<span class="material-symbols-outlined">videocam</span>실시간 인식';

    // 상태 초기화
    isRealtimeActive = false;

    // Canvas 초기화
    const ctx = overlayCanvas.getContext("2d");
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

// 자동 분석 루프
function startAnalysisLoop() {
    analysisInterval = setInterval(async () => {
        if (isRealtimeActive) {
            await analyzeCurrentFrame();
        }
    }, analysisSpeed);
}

// 현재 프레임 분석
async function analyzeCurrentFrame() {
    if (!webcamVideo.videoWidth) return;

    try {
        // Canvas에 현재 프레임 그리기
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = webcamVideo.videoWidth;
        tempCanvas.height = webcamVideo.videoHeight;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(webcamVideo, 0, 0);

        // Blob으로 변환
        const blob = await new Promise((resolve) =>
            tempCanvas.toBlob(resolve, "image/jpeg", 0.8)
        );

        // FormData 생성
        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");

        // API 호출
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        // 결과 처리
        if (result.classified_items > 0) {
            drawDetections(result);
            addToHistory(result);

            // 실시간 인식은 통계에 저장하지 않음 (정확한 통계를 위해)
        } else {
            // 탐지 실패 시 Canvas 초기화
            const ctx = overlayCanvas.getContext("2d");
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
    } catch (error) {
        console.error("분석 중 오류:", error);
    }
}

// 탐지 결과를 Canvas에 그리기
function drawDetections(apiResponse) {
    const ctx = overlayCanvas.getContext("2d");
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Canvas와 Video 크기 비율 계산
    const scaleX = overlayCanvas.width / webcamVideo.videoWidth;
    const scaleY = overlayCanvas.height / webcamVideo.videoHeight;

    apiResponse.recycling_items.forEach((item) => {
        const bbox = item.location.bbox;
        const category = item.recycling_info.category;
        const confidence = (item.recycling_info.confidence * 100).toFixed(0);

        // 바운딩 박스 그리기
        ctx.strokeStyle = "#11d452";
        ctx.lineWidth = 3;
        ctx.strokeRect(
            bbox[0] * scaleX,
            bbox[1] * scaleY,
            (bbox[2] - bbox[0]) * scaleX,
            (bbox[3] - bbox[1]) * scaleY
        );

        // 라벨 배경
        ctx.fillStyle = "rgba(17, 212, 82, 0.9)";
        const label = `${category} ${confidence}%`;
        ctx.font = 'bold 16px "Public Sans", sans-serif';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(
            bbox[0] * scaleX,
            bbox[1] * scaleY - 25,
            textWidth + 10,
            25
        );

        // 라벨 텍스트
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, bbox[0] * scaleX + 5, bbox[1] * scaleY - 7);
    });
}

// 히스토리에 추가
function addToHistory(apiResponse) {
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(
        2,
        "0"
    )}:${String(now.getSeconds()).padStart(2, "0")}`;

    apiResponse.recycling_items.forEach((item) => {
        const category = item.recycling_info.category;
        const confidence = (item.recycling_info.confidence * 100).toFixed(0);

        const historyItem = {
            category,
            confidence,
            time: timeStr,
        };

        detectionHistoryList.unshift(historyItem);

        // 최대 10개만 유지
        if (detectionHistoryList.length > 10) {
            detectionHistoryList.pop();
        }
    });

    renderHistory();
}

// 히스토리 렌더링
function renderHistory() {
    if (detectionHistoryList.length === 0) {
        detectionHistory.innerHTML = `
            <div class="no-history">
                <span class="material-symbols-outlined">history</span>
                <p>아직 탐지된 객체가 없습니다</p>
            </div>
        `;
        return;
    }

    let historyHTML = "";
    detectionHistoryList.forEach((item) => {
        historyHTML += `
            <div class="detection-item">
                <span class="detection-icon">♻️</span>
                <div class="detection-info">
                    <div class="detection-category">${item.category}</div>
                    <div class="detection-confidence">${item.confidence}%</div>
                    <div class="detection-time">${item.time}</div>
                </div>
            </div>
        `;
    });

    detectionHistory.innerHTML = historyHTML;
}

// 분석 주기 슬라이더
speedSlider.addEventListener("input", (e) => {
    analysisSpeed = parseInt(e.target.value);
    speedValue.textContent = `${(analysisSpeed / 1000).toFixed(1)}초`;

    // 인터벌 재시작
    if (analysisInterval && isRealtimeActive) {
        clearInterval(analysisInterval);
        startAnalysisLoop();
    }
});

// ===== 서버 API 호출 함수 =====

// 분석 결과를 서버에 저장
async function saveAnalysisToServer(result) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(result),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ 통계 데이터 저장 완료:", data.message);
    } catch (error) {
        console.error("❌ 통계 저장 오류:", error);
        // 저장 실패해도 사용자 경험에는 영향 없음
    }
}

// ===== 피드백 기능 =====

// 피드백 모달 표시
function showFeedbackModal(predictedClass, confidence, feedbackButton) {
    const categories = ["캔", "유리", "종이", "플라스틱", "스티로폼", "비닐"];

    // 모달 HTML 생성
    const modalHTML = `
        <div class="feedback-modal" id="feedback-modal">
            <div class="feedback-modal-content">
                <div class="feedback-modal-header">
                    <h3>올바른 분류를 선택해주세요</h3>
                    <button class="feedback-modal-close" id="close-feedback-modal">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <p class="feedback-modal-subtitle">
                    예측 결과: <strong>${predictedClass}</strong> (${(
        confidence * 100
    ).toFixed(0)}%)
                </p>
                <div class="feedback-category-grid">
                    ${categories
                        .map(
                            (category) => `
                        <button class="feedback-category-btn" data-category="${category}">
                            <span class="category-icon">♻️</span>
                            <span class="category-name">${category}</span>
                        </button>
                    `
                        )
                        .join("")}
                </div>
            </div>
        </div>
    `;

    // 모달을 body에 추가
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // 모달 요소 가져오기
    const modal = document.getElementById("feedback-modal");
    const closeBtn = document.getElementById("close-feedback-modal");

    // 닫기 버튼 이벤트
    closeBtn.addEventListener("click", () => {
        modal.remove();
    });

    // 모달 외부 클릭 시 닫기
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // 카테고리 버튼 클릭 이벤트
    document.querySelectorAll(".feedback-category-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const actualClass = btn.dataset.category;

            // 피드백 저장
            const success = await saveFeedback(
                predictedClass,
                actualClass,
                confidence
            );

            // 모달 닫기
            modal.remove();

            // 피드백 버튼 상태 변경
            if (success) {
                updateFeedbackButton(feedbackButton, actualClass);
            }
        });
    });
}

// 피드백을 서버에 저장
async function saveFeedback(predictedClass, actualClass, confidence) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/feedback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                predicted_class: predictedClass,
                actual_class: actualClass,
                confidence: confidence,
            }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ 피드백 저장 완료:", data.message);

        return true;
    } catch (error) {
        console.error("❌ 피드백 저장 오류:", error);
        alert("피드백 저장 중 오류가 발생했습니다.");
        return false;
    }
}

// 피드백 버튼 상태 업데이트
function updateFeedbackButton(button, actualClass) {
    // 버튼 비활성화
    button.disabled = true;

    // 버튼 내용 변경
    button.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        <span>피드백 완료 (${actualClass})</span>
    `;

    // 버튼 클래스 변경
    button.classList.add("feedback-submitted");
}

// ===== 지도 기능 =====

// 지도 관련 DOM 요소
const mapSection = document.getElementById("map-section");
const getLocationBtn = document.getElementById("get-location-btn");
const locationInfo = document.getElementById("location-info");
const locationText = document.getElementById("location-text");

// 지도 변수
let map = null;
let userLocation = null;
let currentStep = 0;
let allMarkers = [];
let routePolyline = null;
let currentCategory = null;
let isUpdatingStep = false;

// 1차 시설 (구별 재활용선별시설)
const primaryFacilities = {
    구로구: { name: "구로자원순환센터", lat: 37.4826392, lng: 126.8253645 },
    금천구: { name: "금천자원재활용처리장", lat: 37.4737878, lng: 126.9031066 },
    영등포구: {
        name: "영등포구 재활용선별장",
        lat: 37.5478446,
        lng: 126.8876621,
    },
    동작구: { name: "관악클린센터", lat: 37.4903631, lng: 126.9211172 },
    관악구: { name: "관악클린센터", lat: 37.4903631, lng: 126.9211172 },
    서초구: { name: "서초구재활용센터", lat: 37.459248, lng: 127.040993 },
    강남구: { name: "강남환경자원센터", lat: 37.4701599, lng: 127.1163659 },
    송파구: {
        name: "송파구 혼합재활용품 선별시설",
        lat: 37.472291,
        lng: 127.124073,
    },
    강동구: { name: "강동구 자원순환센터", lat: 37.5703792, lng: 127.1610089 },
    종로구: { name: "성동구 자원회수센터", lat: 37.5540228, lng: 127.0563526 },
    중구: { name: "중구 자원재활용처리장", lat: 37.5606107, lng: 126.9688811 },
    용산구: { name: "용산구 재활용선별장", lat: 37.5309098, lng: 126.952268 },
    성동구: { name: "성동구 자원회수센터", lat: 37.5540228, lng: 127.0563526 },
    광진구: { name: "광진구 폐기물 처리장", lat: 37.5455064, lng: 127.106876 },
    동대문구: {
        name: "동대문구 환경자원센터",
        lat: 37.5732599,
        lng: 127.0385952,
    },
    중랑구: {
        name: "중랑자원재활용선별센터",
        lat: 37.6086205,
        lng: 127.1117656,
    },
    성북구: { name: "성북구재활용집하장", lat: 37.6096311, lng: 127.0700308 },
    강북구: {
        name: "강북재활용품선별처리시설",
        lat: 37.6226845,
        lng: 127.0434891,
    },
    도봉구: { name: "도봉구 자원순환센터", lat: 37.6910855, lng: 127.0437342 },
    노원구: { name: "노원자원회수시설", lat: 37.641004, lng: 127.0577412 },
    은평구: { name: "은평광역자원순환센터", lat: 37.6477892, lng: 126.9066508 },
    서대문구: {
        name: "은평광역자원순환센터",
        lat: 37.6477892,
        lng: 126.9066508,
    },
    마포구: { name: "은평광역자원순환센터", lat: 37.6477892, lng: 126.9066508 },
    양천구: { name: "현대에코텍", lat: 37.4053275, lng: 126.701 },
    강서구: { name: "강서구 재활용 선별장", lat: 37.5769726, lng: 126.8336468 },
};

// 2차 시설 (자원회수시설) 매핑
const secondaryFacilitiesMapping = {
    강남자원회수시설: [
        "강남구",
        "강동구",
        "관악구",
        "광진구",
        "동작구",
        "서초구",
        "성동구",
        "송파구",
    ],
    노원자원회수시설: [
        "중랑구",
        "성북구",
        "강북구",
        "도봉구",
        "노원구",
        "동대문구",
    ],
    마포자원회수시설: ["종로구", "중구", "용산구", "서대문구", "마포구"],
    양천자원회수시설: ["양천구", "강서구", "영등포구"],
    은평광역자원순환센터: ["은평구"],
    광명자원회수시설: ["구로구"],
};

const secondaryFacilities = {
    강남자원회수시설: {
        name: "강남자원회수시설",
        lat: 37.4942316,
        lng: 127.0935988,
    },
    노원자원회수시설: {
        name: "노원자원회수시설",
        lat: 37.641004,
        lng: 127.0577412,
    },
    마포자원회수시설: {
        name: "마포자원회수시설",
        lat: 37.5713992,
        lng: 126.8811307,
    },
    양천자원회수시설: {
        name: "양천자원회수시설",
        lat: 37.5414776,
        lng: 126.8837259,
    },
    은평광역자원순환센터: {
        name: "은평광역자원순환센터",
        lat: 37.6477892,
        lng: 126.9066508,
    },
    광명자원회수시설: {
        name: "광명자원회수시설",
        lat: 37.4246638,
        lng: 126.8634399,
    },
};

// 3차 시설 (최종 매립지)
const tertiaryFacility = {
    name: "수도권매립지관리공사 제3매립장",
    lat: 37.5788003,
    lng: 126.6461257,
};

// 사용자 구 정보 저장
let userDistrict = null;

// "내 위치에서 처리 경로 보기" 버튼 클릭
getLocationBtn.addEventListener("click", async () => {
    try {
        // HTML5 Geolocation으로 위치 가져오기
        const position = await getCurrentPosition();
        userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        };

        console.log("사용자 위치:", userLocation);

        // 네이버 역지오코딩 API로 주소 가져오기
        const addressData = await reverseGeocode(
            userLocation.lat,
            userLocation.lng
        );
        console.log("주소 정보:", addressData);

        // 구 정보 저장
        userDistrict = addressData.gu;

        // 위치 정보 표시
        locationText.textContent = addressData.address;
        locationInfo.classList.remove("hidden");
        getLocationBtn.style.display = "none";

        // 지도 생성 및 표시
        initializeMap(userLocation, addressData.address);

        // 지도 섹션으로 스크롤
        setTimeout(() => {
            document.getElementById("map").scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 300);
    } catch (error) {
        console.error("위치 가져오기 오류:", error);
        alert("위치를 가져올 수 없습니다. 권한을 확인해주세요.");
    }
});

// HTML5 Geolocation으로 현재 위치 가져오기
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation을 지원하지 않는 브라우저입니다."));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });
    });
}

// 백엔드 프록시를 통한 역지오코딩 API 호출
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/geocode/reverse`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ lat, lng }),
        });

        if (!response.ok) {
            throw new Error(`역지오코딩 API 오류: ${response.status}`);
        }

        const data = await response.json();
        console.log("역지오코딩 응답:", data);

        return data;
    } catch (error) {
        console.error("역지오코딩 오류:", error);
        throw error;
    }
}

// 저장된 분석 결과
let lastAnalysisResult = null;

// Leaflet 지도 초기화
function initializeMap(location, address) {
    // 지도 컨테이너 표시
    const mapView = document.getElementById("map");
    mapView.classList.remove("hidden");

    // 지도가 이미 있으면 제거
    if (map) {
        map.remove();
    }

    // 지도 생성
    map = L.map("map").setView([location.lat, location.lng], 12);

    // CartoDB Positron 타일 레이어 추가
    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }
    ).addTo(map);

    // 사용자 위치 마커 추가
    const userMarker = L.marker([location.lat, location.lng], {
        icon: L.divIcon({
            className: "user-location-marker",
            html: `<div class="user-location-icon">🏠</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40],
        }),
    }).addTo(map);

    // 사용자 위치 팝업
    userMarker.bindPopup(`<div class="map-popup-content"><strong>내 위치</strong></div>`);

    allMarkers.push({
        marker: userMarker,
        location: location,
        name: "내 위치",
        address: address,
    });

    // 분석 결과가 있으면 처리 경로 준비
    if (lastAnalysisResult && lastAnalysisResult.classified_items > 0) {
        prepareRecyclingRoute(location);

        // 네비게이션 표시
        document.getElementById("map-navigation").classList.remove("hidden");
        document.getElementById("step-info").classList.remove("hidden");

        // 첫 단계 표시
        currentStep = 0;
        updateStep();
    }
}

// 재활용 처리 경로 준비
function prepareRecyclingRoute(userLocation) {
    if (!lastAnalysisResult || !map || !userDistrict) return;

    // 가장 확률이 높은 클래스 선택
    const topItem = lastAnalysisResult.recycling_items.sort(
        (a, b) => b.recycling_info.confidence - a.recycling_info.confidence
    )[0];
    currentCategory = topItem.recycling_info.category;

    const color = "#11d452";

    // 1차 시설 (구별 선별시설)
    const primary = primaryFacilities[userDistrict];
    if (!primary) return;

    const primaryMarker = L.marker([primary.lat, primary.lng], {
        icon: L.divIcon({
            className: "facility-marker",
            html: `<div class="facility-marker-icon">1</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            opacity: 0,
        }),
    });

    // 팝업 바인딩
    primaryMarker.bindPopup(`<div class="map-popup-content"><strong>${primary.name}</strong></div>`);

    allMarkers.push({
        marker: primaryMarker,
        location: { lat: primary.lat, lng: primary.lng },
        name: primary.name,
        type: "재활용품 선별",
        step: 1,
    });

    // 2차 시설 찾기 (금천구 제외)
    if (userDistrict !== "금천구") {
        let secondaryKey = null;
        for (const [key, districts] of Object.entries(
            secondaryFacilitiesMapping
        )) {
            if (districts.includes(userDistrict)) {
                secondaryKey = key;
                break;
            }
        }

        if (secondaryKey) {
            const secondary = secondaryFacilities[secondaryKey];
            const secondaryMarker = L.marker([secondary.lat, secondary.lng], {
                icon: L.divIcon({
                    className: "facility-marker",
                    html: `<div class="facility-marker-icon">2</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    opacity: 0,
                }),
            });

            // 팝업 바인딩
            secondaryMarker.bindPopup(`<div class="map-popup-content"><strong>${secondary.name}</strong></div>`);

            allMarkers.push({
                marker: secondaryMarker,
                location: { lat: secondary.lat, lng: secondary.lng },
                name: secondary.name,
                type: "신재생에너지 생산",
                step: 2,
            });
        }
    }

    // 3차 시설 (최종 매립지)
    const tertiaryMarker = L.marker(
        [tertiaryFacility.lat, tertiaryFacility.lng],
        {
            icon: L.divIcon({
                className: "facility-marker",
                html: `<div class="facility-marker-icon">${userDistrict === "금천구" ? "2" : "3"}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                opacity: 0,
            }),
        }
    );

    // 팝업 바인딩
    tertiaryMarker.bindPopup(`<div class="map-popup-content"><strong>${tertiaryFacility.name}</strong></div>`);

    allMarkers.push({
        marker: tertiaryMarker,
        location: { lat: tertiaryFacility.lat, lng: tertiaryFacility.lng },
        name: tertiaryFacility.name,
        type: "최종 매립지",
        step: userDistrict === "금천구" ? 2 : 3,
    });
}

// 단계 업데이트
function updateStep() {
    if (isUpdatingStep) return; // 이미 실행중이면 중단
    isUpdatingStep = true;

    const stepInfo = document.getElementById("step-info");
    const stepIndicator = document.getElementById("step-indicator");
    const prevBtn = document.getElementById("prev-step-btn");
    const nextBtn = document.getElementById("next-step-btn");

    stepIndicator.textContent = `${currentStep + 1} / ${allMarkers.length}`;

    // 버튼 비활성화
    prevBtn.disabled = currentStep === 0;
    nextBtn.disabled = currentStep === allMarkers.length - 1;

    // 현재 단계 정보
    const current = allMarkers[currentStep];

    // 경로 그리기
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }

    if (currentStep > 0) {
        const routeCoords = allMarkers
            .slice(0, currentStep + 1)
            .map((m) => [m.location.lat, m.location.lng]);
        routePolyline = L.polyline(routeCoords, {
            color: "#11d452",
            weight: 4,
            opacity: 0.7,
            dashArray: "10, 10",
        }).addTo(map);
    }

    // 마커 표시
    allMarkers.forEach((item, idx) => {
        if (idx <= currentStep) {
            if (!map.hasLayer(item.marker)) {
                item.marker.addTo(map);
            }
            item.marker.setOpacity(1);
        } else {
            if (map.hasLayer(item.marker)) {
                map.removeLayer(item.marker);
            }
        }
    });

    // 지도 중심 이동
    map.setView([current.location.lat, current.location.lng], 13, {
        animate: true,
    });

    // 단계 정보 표시
    if (currentStep === 0) {
        stepInfo.innerHTML = `
            <h4>📍 시작 위치</h4>
            <p>${current.address}</p>
            <p>여기서부터 재활용품의 여정이 시작됩니다.</p>
        `;
    } else {
        stepInfo.innerHTML = `
            <h4>🏭 ${current.step}단계 : ${current.type}</h4>
            <p><strong>${current.name}</strong></p>
            <p>${getStepDescription(current.type, currentCategory)}</p>
        `;
    }

    isUpdatingStep = false; // 플래그 해제
}

// 단계별 설명
function getStepDescription(type, category) {
    const descriptions = {
        "재활용품 선별": `수거된 ${category}을(를) 재활용이 가능한지 판단하는 선별 시설입니다.`,
        "신재생에너지 생산": `재활용이 불가능한 용품들을 소각하여 전기와 열을 생산하는 자원회수시설입니다.<br/><br/>• 소각 시 발생하는 열로 물을 끓여 고압 증기를 만들고, 이 증기가 터빈을 돌려 전기를 생산합니다.<br/>• 남은 열은 지역난방으로 활용되어 가정과 건물에 난방을 공급합니다.`,
        "최종 매립지": `소각 후 남은 재와 재활용되지 못한 쓰레기를 최종적으로 매립하는 시설입니다.`,
    };
    return descriptions[type] || `${category} 재활용 처리가 진행됩니다.`;
}

// 네비게이션 버튼 이벤트
document.getElementById("prev-step-btn").addEventListener("click", () => {
    if (currentStep > 0) {
        currentStep--;
        updateStep();
        // 설명이 보이도록 스크롤
        setTimeout(() => {
            const stepInfo = document.getElementById("step-info");
            const rect = stepInfo.getBoundingClientRect();
            const absoluteTop = rect.top + window.pageYOffset;
            const offsetPosition = absoluteTop + stepInfo.offsetHeight - window.innerHeight + 20;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }, 100);
    }
});

document.getElementById("next-step-btn").addEventListener("click", () => {
    if (currentStep < allMarkers.length - 1) {
        currentStep++;
        updateStep();
        // 설명이 보이도록 스크롤
        setTimeout(() => {
            const stepInfo = document.getElementById("step-info");
            const rect = stepInfo.getBoundingClientRect();
            const absoluteTop = rect.top + window.pageYOffset;
            const offsetPosition = absoluteTop + stepInfo.offsetHeight - window.innerHeight + 20;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }, 100);
    }
});

// 분석 결과가 표시될 때 지도 섹션도 표시
const originalDisplayResults = displayResults;
displayResults = function (apiResponse) {
    originalDisplayResults(apiResponse);

    // 분석 결과 저장
    lastAnalysisResult = apiResponse;

    // 분류 성공 시 지도 섹션 표시
    if (apiResponse.classified_items > 0) {
        mapSection.classList.remove("hidden");
    }
};
