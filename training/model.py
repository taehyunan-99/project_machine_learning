# AI Model 구현 및 학습

import torch
import torchvision.models as models
import torch.nn as nn
import torch.optim as optim
from torchvision import transforms, datasets
from torch.utils.data import DataLoader

# 분류할 클래스 수
num_classes = 6

# 이미 학습되어 있는 resnet18 모델 불러오기
model = models.resnet18(pretrained=True)
model.fc = nn.Linear(512, num_classes)

# 데이터 불러오기
transform = transforms.Compose([
    # 데이터 전처리 (224x224) 사이즈로 통일
    transforms.Resize((224,224)),
    # 텐서로 변환
    transforms.ToTensor(),
    # ImageNet 통계로 정규화
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# 데이터 로더 생성 함수 (학습 시에만 호출)
def create_data_loaders():
    # 데이터 불러오기
    train_dataset = datasets.ImageFolder("dataset/data/train", transform=transform)
    test_dataset = datasets.ImageFolder("dataset/data/test", transform=transform)
    valid_dataset = datasets.ImageFolder("dataset/data/valid", transform=transform)

    # 배치 사이즈 설정
    batch_size = 32

    # 데이터 로더 생성
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True, # 에포크마다 섞어서 훈련
        num_workers=0 # 병렬처리할 cpu 코어 / 윈도우 multiprocessing error시 0으로 처리
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0
    )
    valid_loader = DataLoader(
        valid_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0
    )

    return train_loader, test_loader, valid_loader

# 사용가능한 디바이스 확인
if torch.cuda.is_available():
    device = torch.device('cuda')
    print("CUDA GPU 사용")
    print(f"GPU 이름: {torch.cuda.get_device_name(0)}")
elif torch.backends.mps.is_available():
    device = torch.device('mps')
    print("Apple MPS (Metal Performance Shaders) 사용")
else:
    device = torch.device('cpu')
    print("CPU 사용")

print(f"선택된 디바이스: {device}")

# 모델을 디바이스로 이동
model = model.to(device)

# 손실 함수 정의
criterion = nn.CrossEntropyLoss()

# 옵티마이저 설정
optimizer = optim.Adam(model.parameters(), lr=0.001)

# 학습 루프 함수 정의
def train_loop(data_loader, model, criterion, optimizer):
    model.train() # 학습 모드
    size = len(data_loader.dataset)
    running_loss = 0.

    for batch_idx, (data, target) in enumerate(data_loader):
        device = next(model.parameters()).device
        data, target = data.to(device), target.long().to(device)

        optimizer.zero_grad()
        outputs = model(data)
        loss = criterion(outputs, target)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * data.size(0)

        if (batch_idx+1) % 10 == 0:
            current = batch_idx * len(data)
            print(f"[batch : {batch_idx+1: 4d}], Loss : {loss.item():>7f} ({current:>5d} / {size:>5d})")
    
    epoch_loss = running_loss / size
    return epoch_loss

# 검증 루프 함수 정의
def valid_loop(data_loader, model, criterion):
    model.eval() # 평가 모드
    size = len(data_loader.dataset)
    valid_loss = 0.
    correct = 0

    with torch.no_grad():
        for data, target in data_loader:
            device = next(model.parameters()).device
            data, target = data.to(device), target.long().to(device)

            outputs = model(data)
            loss = criterion(outputs, target)
            valid_loss += loss.item() * data.size(0)

            # 정확도 계산
            predictions = torch.argmax(outputs, dim=1)
            correct += (predictions == target).sum().item()
        
    # 평균 계산
    avg_loss = valid_loss / size
    accuracy = correct / size

    print(f"Validation Results: Accuracy: {accuracy:.3f} ({100*accuracy:.1f}%), Avg loss: {avg_loss:.4f}")
    return avg_loss, accuracy

# 학습 실행
# epochs = 5 # 반복 학습

# for epoch in range(epochs):
#     print(f"\n[Epoch] {epoch+1} / {epochs}")
#     train_loss = train_loop(train_loader, model, criterion, optimizer)
#     valid_loss, valid_acc = valid_loop(valid_loader, model, criterion)

# print("\n학습 및 검증 완료!")

# torch.save(model.state_dict(), "test_model.pth")
# print("\n모델 저장 완료!")