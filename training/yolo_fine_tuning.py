# YOLO 파인 튜닝

import os
from pathlib import Path

# 클래스 매핑
class_mapping = {
    'can': 0,
    'glass': 1,
    'paper': 2,
    'plastic': 3,
    'styrofoam': 4,
    'vinyl': 5
}