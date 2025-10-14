// API URL 설정 (환경 자동 감지)
function getApiUrl() {
    const hostname = window.location.hostname;

    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // Vercel 프로덕션 환경
    // 배포 후 실제 백엔드 URL로 변경 필요
    return '/api';  // Vercel Serverless Functions 사용 시
}

const API_BASE_URL = getApiUrl();

// DOM 요소 선택
const imageUploadInput = document.getElementById("image-upload");
const realtimeBtn = document.getElementById("realtime-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const inputArea = document.getElementById("input-area");
const uploadPrompt = document.getElementById("upload-prompt");
const imagePreviewContainer = document.getElementById("image-preview-container");
const cameraFeedContainer = document.getElementById("camera-feed-container");
const resultsSection = document.getElementById("results-section");
const homeLogo = document.getElementById("home-logo");

// 모바일 메뉴 설정
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
    inputArea.classList.remove("has-image");
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
            <div class="result-header">
                <span class="result-icon">🔍</span>
                <div>
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
                <div class="result-content">
                    <div class="result-header">
                        <span class="result-icon">♻️</span>
                        <div>
                            <p class="result-label">${category} (${confidence}%)</p>
                            <p class="result-status">재활용 가능</p>
                        </div>
                    </div>
                    <p class="result-description">${method}</p>
                </div>
                <div class="feedback-section">
                    <button class="feedback-btn" data-category="${category}" data-confidence="${actualConfidence}">
                        <span class="material-symbols-outlined">report</span>
                        <span>결과가 잘못되었나요?</span>
                    </button>
                </div>
            </div>
            ${index < apiResponse.recycling_items.length - 1 ? '<hr style="margin: 1rem 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">' : ''}
        `;
    });

    resultsCard.innerHTML = resultsHTML;

    // 피드백 버튼 이벤트 리스너 추가
    document.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
            audio: false
        });

        // video 요소에 스트림 연결
        webcamVideo.srcObject = realtimeStream;

        // UI 전환
        uploadPrompt.classList.add("hidden");
        imagePreviewContainer.classList.add("hidden");
        cameraFeedContainer.classList.remove("hidden");
        resultsSection.classList.add("hidden");
        realtimeHistory.classList.remove("hidden");

        // 클래스 추가 (클릭 방지)
        inputArea.classList.add("realtime-active");
        buttonGroup.classList.add("realtime-active");

        // 컨트롤 표시
        realtimeControls.classList.remove("hidden");

        // 버튼 텍스트 변경
        realtimeBtn.innerHTML = '<span class="material-symbols-outlined">stop_circle</span>실시간 인식 중지';

        // 상태 변경 및 히스토리 초기화
        isRealtimeActive = true;
        detectionHistoryList = [];
        renderHistory();

        // Canvas 크기 설정
        webcamVideo.addEventListener('loadedmetadata', () => {
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
        realtimeStream.getTracks().forEach(track => track.stop());
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
    buttonGroup.classList.remove("realtime-active");

    // 버튼 텍스트 복원
    realtimeBtn.innerHTML = '<span class="material-symbols-outlined">videocam</span>실시간 인식';

    // 상태 초기화
    isRealtimeActive = false;

    // Canvas 초기화
    const ctx = overlayCanvas.getContext('2d');
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
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = webcamVideo.videoWidth;
        tempCanvas.height = webcamVideo.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(webcamVideo, 0, 0);

        // Blob으로 변환
        const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg', 0.8));

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
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }

    } catch (error) {
        console.error("분석 중 오류:", error);
    }
}

// 탐지 결과를 Canvas에 그리기
function drawDetections(apiResponse) {
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Canvas와 Video 크기 비율 계산
    const scaleX = overlayCanvas.width / webcamVideo.videoWidth;
    const scaleY = overlayCanvas.height / webcamVideo.videoHeight;

    apiResponse.recycling_items.forEach(item => {
        const bbox = item.location.bbox;
        const category = item.recycling_info.category;
        const confidence = (item.recycling_info.confidence * 100).toFixed(0);

        // 바운딩 박스 그리기
        ctx.strokeStyle = '#11d452';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            bbox[0] * scaleX,
            bbox[1] * scaleY,
            (bbox[2] - bbox[0]) * scaleX,
            (bbox[3] - bbox[1]) * scaleY
        );

        // 라벨 배경
        ctx.fillStyle = 'rgba(17, 212, 82, 0.9)';
        const label = `${category} ${confidence}%`;
        ctx.font = 'bold 16px "Public Sans", sans-serif';
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(bbox[0] * scaleX, bbox[1] * scaleY - 25, textWidth + 10, 25);

        // 라벨 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, bbox[0] * scaleX + 5, bbox[1] * scaleY - 7);
    });
}

// 히스토리에 추가
function addToHistory(apiResponse) {
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    apiResponse.recycling_items.forEach(item => {
        const category = item.recycling_info.category;
        const confidence = (item.recycling_info.confidence * 100).toFixed(0);

        const historyItem = {
            category,
            confidence,
            time: timeStr
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

    let historyHTML = '';
    detectionHistoryList.forEach(item => {
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
                "Content-Type": "application/json"
            },
            body: JSON.stringify(result)
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
                    예측 결과: <strong>${predictedClass}</strong> (${(confidence * 100).toFixed(0)}%)
                </p>
                <div class="feedback-category-grid">
                    ${categories.map(category => `
                        <button class="feedback-category-btn" data-category="${category}">
                            <span class="category-icon">♻️</span>
                            <span class="category-name">${category}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // 모달을 body에 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 모달 요소 가져오기
    const modal = document.getElementById('feedback-modal');
    const closeBtn = document.getElementById('close-feedback-modal');

    // 닫기 버튼 이벤트
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // 카테고리 버튼 클릭 이벤트
    document.querySelectorAll('.feedback-category-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const actualClass = btn.dataset.category;

            // 피드백 저장
            const success = await saveFeedback(predictedClass, actualClass, confidence);

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
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                predicted_class: predictedClass,
                actual_class: actualClass,
                confidence: confidence
            })
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
    // 버튼 비활성화 및 스타일 변경
    button.disabled = true;
    button.style.cursor = 'default';

    // 버튼 내용 변경
    button.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        <span>피드백 완료 (${actualClass})</span>
    `;

    // 버튼 클래스 변경
    button.classList.add('feedback-submitted');
}
