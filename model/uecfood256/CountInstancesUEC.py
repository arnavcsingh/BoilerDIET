import matplotlib.pyplot as plt
import os

path = r"C:\Users\ricep\Downloads\yolotestlocal\UECFOOD256"

names = []
counts = []

for folder in os.listdir(path):
    folder_path = os.path.join(path, folder)
    
    if os.path.isdir(folder_path):
        num = len(os.listdir(folder_path))
        
        print(f"Found folder: {folder} with {num} items")
        
        names.append(folder)
        counts.append(num)

plt.figure(figsize=(5, 50))
plt.barh(names, counts)
plt.title("Class Counts")
plt.show()