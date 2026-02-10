import os
import shutil
from PIL import Image

VFN_ROOT = r"C:\Users\arnsf\Desktop\PURDUE\Freshman Sem1\VIPER IPAA II\Code\model\vfn_1_0\vfn_1_0"

META_DIR = os.path.join(VFN_ROOT, "Meta")
IMAGES_DIR = os.path.join(VFN_ROOT, "Images")

OUT_IMAGES_TRAIN = "images/train"
OUT_IMAGES_VAL = "images/val"
OUT_LABELS_TRAIN = "labels/train"
OUT_LABELS_VAL = "labels/val"

os.makedirs(OUT_IMAGES_TRAIN, exist_ok=True)
os.makedirs(OUT_IMAGES_VAL, exist_ok=True)
os.makedirs(OUT_LABELS_TRAIN, exist_ok=True)
os.makedirs(OUT_LABELS_VAL, exist_ok=True)

#reordering classes
SELECTED_CATEGORIES = {
    60: 0,  # pizza
    27: 1,  # chicken_nugget
    41: 2,  # french_fries
    44: 3,  # fried_rice
    50: 4   # ice_cream
}

def load_ids(path):
    with open(path, "r") as f:
        return set(line.strip() for line in f)

train_ids = load_ids(os.path.join(META_DIR, "training.txt"))
val_ids = load_ids(os.path.join(META_DIR, "validation.txt"))

annotations = {}

with open(os.path.join(META_DIR, "annotations.txt"), "r") as f:
    for line in f:
        img_name, x1, y1, x2, y2, cat_id = line.split()
        cat_id = int(cat_id)

        if cat_id not in SELECTED_CATEGORIES:
            continue

        if img_name not in annotations:
            annotations[img_name] = []

        annotations[img_name].append((
            SELECTED_CATEGORIES[cat_id],
            float(x1),
            float(y1),
            float(x2),
            float(y2)
        ))

def find_image(img_name):
    for root, _, files in os.walk(IMAGES_DIR):
        if img_name in files:
            return os.path.join(root, img_name)
    return None

def process_split(image_ids, out_img_dir, out_lbl_dir):
    count = 0

    for img_name in image_ids:
        if img_name not in annotations:
            continue

        img_path = find_image(img_name)
        if img_path is None:
            continue

        img = Image.open(img_path)
        width, height = img.size

        label_path = os.path.join(out_lbl_dir, img_name.replace(".jpg", ".txt"))
        with open(label_path, "w") as lf:
            for cls, x1, y1, x2, y2 in annotations[img_name]:
                x_center = ((x1 + x2) / 2) / width
                y_center = ((y1 + y2) / 2) / height
                box_w = (x2 - x1) / width
                box_h = (y2 - y1) / height

                lf.write(
                    f"{cls} {x_center:.6f} {y_center:.6f} "
                    f"{box_w:.6f} {box_h:.6f}\n"
                )

        shutil.copy(img_path, out_img_dir)
        count += 1

    return count

train_count = process_split(train_ids, OUT_IMAGES_TRAIN, OUT_LABELS_TRAIN)
val_count = process_split(val_ids, OUT_IMAGES_VAL, OUT_LABELS_VAL)

print("Dataset preparation complete.")
print(f"Train images: {train_count}")
print(f"Validation images: {val_count}")