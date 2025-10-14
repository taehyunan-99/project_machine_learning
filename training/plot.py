import pandas as pd
import matplotlib.pyplot as plt
import platform

# Set Korean font based on the operating system
if platform.system() == 'Windows':
    plt.rc('font', family='Malgun Gothic')
elif platform.system() == 'Darwin': # macOS
    plt.rc('font', family='AppleGothic')
else: # Linux (requires font installation)
    # For Linux, you might need to install a Korean font first.
    # Example: !sudo apt-get install -y fonts-nanum
    # Then, you need to rebuild the font cache.
    # import matplotlib.font_manager as fm
    # fm._rebuild()
    plt.rc('font', family='NanumGothic')

# Ensure the minus sign is displayed correctly
plt.rcParams['axes.unicode_minus'] = False

# Data for the chart
data = {
    '품목': ['전체 재활용률', '음식쓰레기', '종이', '유리', '캔 (Can-to-Can)', '플라스틱 (물질 재활용)', '종이팩'],
    '재활용률': [86.0, 98.0, 85.6, 79.6, 34.0, 16.4, 13.7] # Using an average for cans
}
df = pd.DataFrame(data)

# Sort the data by recycling rate for better visualization
df_sorted = df.sort_values(by='재활용률', ascending=False)

# Create the bar chart
plt.figure(figsize=(12, 8))
bars = plt.bar(df_sorted['품목'], df_sorted['재활용률'], color=['#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#F44336'])

# Add title and labels
plt.title('대한민국 전체 및 주요 품목별 재활용률 비교', fontsize=18, pad=20)
plt.ylabel('재활용률 (%)', fontsize=12)
plt.ylim(0, 110)
plt.xticks(rotation=15, ha='right')

# Display the percentage value on top of each bar
for bar in bars:
    yval = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2.0, yval + 1.5, f'{yval:.1f}%', ha='center', va='bottom', fontsize=11)

# Show the plot
plt.tight_layout()
plt.show()