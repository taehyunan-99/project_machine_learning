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
        const response = await fetch("http://localhost:8000/predict", {
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

    apiResponse.recycling_items.forEach((item) => {
        const category = item.recycling_info.category;
        const confidence = (item.recycling_info.confidence * 100).toFixed(0);
        const method = item.recycling_info.recycling_method;

        resultsHTML += `
            <div class="result-header">
                <span class="result-icon">♻️</span>
                <div>
                    <p class="result-label">${category} (${confidence}%)</p>
                    <p class="result-status">재활용 가능</p>
                </div>
            </div>
            <p class="result-description">${method}</p>
            <hr style="margin: 1rem 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        `;
    });

    resultsCard.innerHTML = resultsHTML;
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
        const response = await fetch("http://localhost:8000/predict", {
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
        const response = await fetch("http://localhost:8000/api/stats", {
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
