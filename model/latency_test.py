import torch
import time
from ultralytics import YOLO
import pandas as pd
import matplotlib.pyplot as plt
import os

models = {
"./runs/detect/runs_vfn/yolov8n_160/weights/best.pt":160,
"./runs/detect/runs_vfn/yolov8n_320/weights/best.pt":320,
"./runs/detect/runs_vfn/yolov8n_416/weights/best.pt":416,
"./runs/detect/runs_vfn/yolov8n_480/weights/best.pt":480,
"./runs/detect/runs_vfn/yolov8n_640/weights/best.pt":640,
"./runs/detect/runs_vfn/yolov8s_6404/weights/best.pt":640,
"./runs/detect/runs_vfn/yolov8s_768_/weights/best.pt":768
}

runs = 300
warmup = 50

device = "cuda" if torch.cuda.is_available() else "cpu"

latencies = []
accuracies = []
labels = []
sizes = []

for path, size in models.items():

    model = YOLO(path).model
    model.eval().to(device)

    dummy = torch.randn(1,3,size,size).to(device)

    for _ in range(warmup):
        with torch.no_grad():
            model(dummy)

    if device == "cuda":
        torch.cuda.synchronize()

    start = time.time()

    for _ in range(runs):
        with torch.no_grad():
            model(dummy)

    if device == "cuda":
        torch.cuda.synchronize()

    end = time.time()

    latency = (end-start)/runs*1000

    print(f"{path} | {size}x{size} -> {latency:.2f} ms")

    latencies.append(latency)
    sizes.append(size)

    run_dir = os.path.dirname(os.path.dirname(path))
    results_csv = os.path.join(run_dir, "results.csv")

    df = pd.read_csv(results_csv)
    map50 = df["metrics/mAP50(B)"].max()

    accuracies.append(map50)
    labels.append(os.path.basename(run_dir))

df_results = pd.DataFrame({
"model": labels,
"resolution": sizes,
"latency_ms": latencies,
"mAP50": accuracies
})

df_results.to_csv("latency_accuracy_results.csv", index=False)

print("\nSaved results to latency_accuracy_results.csv")

plt.figure(figsize=(8,6))
plt.scatter(latencies, accuracies)

for i, label in enumerate(labels):
    plt.annotate(label, (latencies[i], accuracies[i]))

plt.xlabel("Latency (ms)")
plt.ylabel("mAP50")
plt.title("Accuracy vs Latency Tradeoff")

plt.grid(True)
plt.tight_layout()

plt.savefig("latency_vs_accuracy.png")

print("Saved plot to latency_vs_accuracy.png")

plt.show()