from ultralytics import YOLO

model = YOLO("yolov8n.pt")

model.train(
    data="vfn_yolo/data.yaml",
    epochs=100,
    imgsz=160,
    batch=16,
    project="runs_vfn",
    name="yolov8n_160"
)