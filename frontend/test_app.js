document.getElementById("file-upload").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const resultArea = document.getElementById("result-area");
    resultArea.innerHTML = "<p>분석 중...</p>";

    fetch("http://localhost:8000/predict", {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((result) => {
            resultArea.innerHTML = `
            <div class="text-left space-y-4">
                <h4 class="text-xl font-bold text-primary">분석 완료</h4>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white/10 dark:bg-black/20 p-4 rounded-lg">
                        <p class="text-sm opacity-70">파일명</p>
                        <p class="font-medium">${result.filename}</p>
                    </div>
                    
                    <div class="bg-white/10 dark:bg-black/20 p-4 rounded-lg">
                        <p class="text-sm opacity-70">신뢰도</p>
                        <p class="font-medium">${result.confidence}%</p>
                    </div>
                </div>
                
                <div class="bg-primary/10 p-6 rounded-lg text-center">
                    <p class="text-sm opacity-70 mb-2">분류 결과</p>
                    <p class="text-2xl font-bold text-primary">${result.label}</p>
                </div>
                
                <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400">
                    <p class="font-medium text-blue-800 dark:text-blue-200">배출 방법</p>
                    <p class="text-sm text-blue-700 dark:text-blue-300">${result.disposal_method}</p>
                </div>
            </div>
        `;
        })
        .catch((error) => {
            resultArea.innerHTML = `<p class="text-red-500">오류: ${error.message}</p>`;
        });
});