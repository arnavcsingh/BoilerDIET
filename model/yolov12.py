from ultralytics import YOLO

model = YOLO("yolov8s.pt")

model.train(
    data="vfn_yolo/data.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    project="runs_vfn",
    name="yolov8s_640"
)