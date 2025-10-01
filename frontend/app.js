// DOM(Document Object Model)이 완전히 로드되었을 때 이 안의 코드를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');
    const runPredictionBtn = document.getElementById('run-prediction-btn');

    const resultSection = document.getElementById('result-section');
    const resultCard = document.getElementById('result-card');
    const guideCard = document.getElementById('guide-card');

    const feedbackSection = document.getElementById('feedback-section');
    const feedbackCorrectBtn = document.getElementById('feedback-correct-btn');
    const feedbackIncorrectBtn = document.getElementById('feedback-incorrect-btn');

    const loader = document.getElementById('loader');
    const toast = document.getElementById('toast');

    let uploadedFile = null; // 사용자가 업로드한 파일 객체를 저장할 변수

    // --- 1. 이미지 업로드 & 미리보기 기능 ---
    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];

        if (file) {
            uploadedFile = file; // 업로드된 파일 저장
            imagePreview.src = URL.createObjectURL(file);
            runPredictionBtn.disabled = false;
            resultSection.classList.add('hidden');
            feedbackSection.classList.add('hidden');
        } else {
            uploadedFile = null; // 파일 선택 취소 시 초기화
            imagePreview.src = ""; // 미리보기 제거
            runPredictionBtn.disabled = true; // 버튼 비활성화
            showToast("이미지 선택을 취소했습니다.");
        }
    });

    // --- 2 & 3. YOLO 예측 실행 기능 ---
    runPredictionBtn.addEventListener('click', async () => {
        if (!uploadedFile) {
            showToast("먼저 이미지를 선택해주세요.");
            return;
        }

        showLoader(); // 로딩 스피너 표시
        runPredictionBtn.disabled = true; // 예측 중에는 버튼 비활성화

        try {
            // FormData를 사용하여 이미지 파일을 서버로 전송합니다.
            const formData = new FormData();
            formData.append('image', uploadedFile); // 'image'는 서버에서 이미지를 받을 때 사용할 이름입니다.

            // --- 여기를 실제 YOLO API 엔드포인트로 변경하세요! ---
            const YOLO_API_ENDPOINT = 'http://localhost:5000/predict'; // 예시: 로컬 서버의 /predict 엔드포인트
            // ----------------------------------------------------

            const response = await fetch(YOLO_API_ENDPOINT, {
                method: 'POST',
                body: formData, // 이미지 데이터 전송
                // 'Content-Type': 'multipart/form-data' 헤더는 FormData 사용 시 자동으로 설정됩니다.
            });

            // 응답이 성공적인지 확인
            if (!response.ok) {
                const errorText = await response.text(); // 서버에서 보낸 에러 메시지를 확인
                throw new Error(`Server responded with status ${response.status}: ${errorText}`);
            }

            const realResult = await response.json(); // 서버에서 JSON 형태로 결과 받아오기
            console.log("YOLO 분석 결과:", realResult); // 개발자 도구 콘솔에서 결과 확인

            // 서버 응답 형식에 맞춰 결과 처리
            // 예시: 서버가 { label: "페트병", confidence: 0.95 } 와 같은 형태로 응답한다고 가정
            if (realResult && realResult.label && realResult.confidence) {
                // 배출 요령 데이터는 서버에서 함께 보내주거나 클라이언트에서 매칭할 수 있습니다.
                // 여기서는 서버에서 준 label에 따라 클라이언트에서 가이드 정보를 매칭합니다.
                const guideData = getRecyclingGuide(realResult.label);

                displayResults({
                    label: realResult.label,
                    confidence: realResult.confidence,
                    guide: guideData
                });
            } else {
                throw new Error("서버 응답 형식이 올바르지 않습니다.");
            }

        } catch (error) {
            console.error("YOLO 분석 중 에러 발생:", error);
            showToast("분석 중 오류가 발생했습니다. 다시 시도해 주세요. (" + error.message + ")");
            // 에러 발생 시 UI 초기화 또는 에러 메시지 표시
            resultSection.classList.add('hidden');
            feedbackSection.classList.add('hidden');
        } finally {
            hideLoader(); // 로딩 스피너 숨기기
            runPredictionBtn.disabled = false; // 버튼 다시 활성화
        }
    });

    // --- 4 & 5. 결과 카드 & 배출 요령 안내 기능 ---
    function displayResults(result) {
        resultCard.innerHTML = `
            <p>분석 결과</p>
            <p class="label">${result.label}</p>
            <p class="confidence">정확도: ${(result.confidence * 100).toFixed(0)}%</p>
        `;

        if (result.guide) {
            guideCard.innerHTML = `
                <h3>${result.guide.title}</h3>
                <ul>
                    ${result.guide.steps.map(step => `<li>${step}</li>`).join('')}
                </ul>
            `;
        } else {
            guideCard.innerHTML = `<h3>배출 요령을 찾을 수 없습니다.</h3><p>더 많은 정보는 관리자에게 문의하세요.</p>`;
        }


        resultSection.classList.remove('hidden');
        feedbackSection.classList.remove('hidden');
    }

    // --- 배출 요령 데이터 (클라이언트에서 관리) ---
    // 실제 서비스에서는 이 데이터를 서버 API로 받거나, 더 복잡하게 관리할 수 있습니다.
    const recyclingGuides = {
        "종이": {
            title: "종이류 배출 요령 📰",
            steps: [
                "물기에 젖지 않도록 펴서 차곡차곡 쌓아 묶어서 배출해주세요.",
                "비닐 코팅된 표지, 공책의 스프링 등은 제거해주세요.",
                "상자는 테이프, 택배 스티커 등을 모두 제거하고 펼쳐서 배출해주세요."
            ]
        },
        "유리": {
            title: "유리병 배출 요령 🍾",
            steps: [
                "내용물을 깨끗이 비우고 물로 헹궈 배출해주세요.",
                "담배꽁초 등 이물질을 넣지 말아주세요.",
                "병뚜껑은 재질에 맞게 분리해서 배출해주세요.",
                "깨진 유리는 재활용이 어려우니 신문지에 싸서 종량제 봉투로 버려주세요."
            ]
        },
        "캔": {
            title: "캔류(철/알루미늄) 배출 요령 🥫",
            steps: [
                "내용물을 깨끗이 비우고 물로 헹궈 배출해주세요.",
                "겉에 붙은 플라스틱 뚜껑이나 라벨은 제거해주세요.",
                "가스 용기(부탄가스, 살충제 등)는 구멍을 뚫어 내용물을 비운 후 배출해주세요."
            ]
        },
        "플라스틱": {
            title: "플라스틱류 배출 요령 🧴",
            steps: [
                "내용물을 비우고 깨끗하게 헹궈주세요.",
                "페트병과 플라스틱 용기에 붙은 비닐 라벨을 반드시 제거해주세요.",
                "뚜껑 등 다른 재질로 된 부분은 분리해서 배출해주세요.",
                "알약 포장재, 칫솔, 장난감 등 여러 재질이 섞인 것은 종량제 봉투로 버려주세요."
            ]
        },
        "비닐": {
            title: "비닐류 배출 요령 🛍️",
            steps: [
                "과자, 라면 봉지 등 모든 비닐은 내용물을 비우고 깨끗하게 헹궈 배출해주세요.",
                "이물질 제거가 어려운 경우 종량제 봉투로 버려주세요.",
                "여러 장을 흩날리지 않도록 투명 봉투에 담아 배출해주세요."
            ]
        },
        "스티로폼": {
            title: "스티로폼 배출 요령 📦",
            steps: [
                "내용물을 완전히 비우고, 음식물이 묻어있다면 깨끗하게 세척해주세요.",
                "테이프, 택배 스티커, 상표 등을 완전히 제거해주세요.",
                "농수산물 포장에 사용된 스티로폼 상자는 흩날리지 않게 묶어서 배출해주세요.",
                "이물질 제거가 어렵거나, 컵라면 용기처럼 색이 있거나 코팅된 스티로폼은 종량제 봉투로 버려주세요."
            ]
        },
        // 다른 재활용품에 대한 가이드를 여기에 추가할 수 있습니다.
    };
    function getRecyclingGuide(label) {
        return recyclingGuides[label] || {
            title: `${label} 배출 요령 (정보 없음)`,
            steps: ["해당 품목에 대한 자세한 배출 요령을 찾을 수 없습니다."]
        };
    }


    // --- 6. 피드백 저장 기능 ---
    feedbackCorrectBtn.addEventListener('click', () => {
        // 실제로는 서버에 피드백 데이터를 전송합니다.
        showToast("피드백 감사합니다!");
        feedbackSection.classList.add('hidden');
    });

    feedbackIncorrectBtn.addEventListener('click', () => {
        showToast("피드백 감사합니다! 더 발전하는 모델이 될게요.");
        feedbackSection.classList.add('hidden');
    });

    // --- 7. 로딩/에러 UX (헬퍼 함수) ---
    function showLoader() {
        loader.classList.remove('hidden');
    }

    function hideLoader() {
        loader.classList.add('hidden');
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});