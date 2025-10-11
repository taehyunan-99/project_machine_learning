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

// 실시간 인식 버튼
realtimeBtn.addEventListener("click", () => {
    uploadPrompt.classList.add("hidden");
    imagePreviewContainer.classList.add("hidden");
    cameraFeedContainer.classList.remove("hidden");
    inputArea.classList.remove("image-preview-placeholder");
    resultsSection.classList.add("hidden");
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
