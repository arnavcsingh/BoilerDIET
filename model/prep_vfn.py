import os
import shutil
from PIL import Image
from collections import defaultdict

VFN_ROOT = r"/home/sing2415/diet/model/vfn_1_0/vfn_1_0"

META_DIR = os.path.join(VFN_ROOT, "Meta")
IMAGES_DIR = os.path.join(VFN_ROOT, "Images")

OUT_ROOT = "vfn_yolo"  # output dataset root folder
OUT_IMAGES_TRAIN = os.path.join(OUT_ROOT, "images/train")
OUT_IMAGES_VAL   = os.path.join(OUT_ROOT, "images/val")
OUT_IMAGES_TEST  = os.path.join(OUT_ROOT, "images/test")

OUT_LABELS_TRAIN = os.path.join(OUT_ROOT, "labels/train")
OUT_LABELS_VAL   = os.path.join(OUT_ROOT, "labels/val")
OUT_LABELS_TEST  = os.path.join(OUT_ROOT, "labels/test")

DATA_YAML_PATH = os.path.join(OUT_ROOT, "data.yaml")

for p in [
    OUT_IMAGES_TRAIN, OUT_IMAGES_VAL, OUT_IMAGES_TEST,
    OUT_LABELS_TRAIN, OUT_LABELS_VAL, OUT_LABELS_TEST
]:
    os.makedirs(p, exist_ok=True)


def load_ids(path):
    with open(path, "r") as f:
        return set(line.strip() for line in f if line.strip())

def clamp(v, lo, hi):
    return max(lo, min(v, hi))


train_ids = load_ids(os.path.join(META_DIR, "training.txt"))
val_ids   = load_ids(os.path.join(META_DIR, "validation.txt"))
test_ids  = load_ids(os.path.join(META_DIR, "testing.txt"))

print(f"Split sizes (raw ids): train={len(train_ids)}, val={len(val_ids)}, test={len(test_ids)}")


category_name_by_id = {}

with open(os.path.join(META_DIR, "category_ids.txt"), "r") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue

        # Many datasets use: "<id> <name>"
        # If names could contain spaces, you'd need a different parser,
        # but VFN category names are typically single tokens/underscored.
        parts = line.split()
        cat_id = int(parts[0])
        cat_name = " ".join(parts[1:])  # safe if it ever contains spaces
        category_name_by_id[cat_id] = cat_name

sorted_cat_ids = sorted(category_name_by_id.keys())
cat_id_to_yolo = {cat_id: i for i, cat_id in enumerate(sorted_cat_ids)}
yolo_names = [category_name_by_id[cat_id] for cat_id in sorted_cat_ids]

print(f"Detected categories from category_ids.txt: {len(yolo_names)} (expected 82)")


# raw_annotations[img_name] = list of (cat_id, x1, y1, x2, y2)
raw_annotations = defaultdict(list)

with open(os.path.join(META_DIR, "annotations.txt"), "r") as f:
    for line in f:
        img_name, x1, y1, x2, y2, cat_id = line.split()
        cat_id = int(cat_id)

        # Only keep boxes for categories we have names for
        # (should be all 82, but this prevents crashes if file mismatch)
        if cat_id not in cat_id_to_yolo:
            continue

        raw_annotations[img_name].append(
            (cat_id, float(x1), float(y1), float(x2), float(y2))
        )

print(f"Images with at least one annotation: {len(raw_annotations)}")


print("Indexing image paths...")
image_index = {}

for root, _, files in os.walk(IMAGES_DIR):
    for file in files:
        # If there are duplicates across folders (unlikely), last wins.
        image_index[file] = os.path.join(root, file)

print(f"Indexed {len(image_index)} image files.")


def process_split(image_ids, out_img_dir, out_lbl_dir, split_name):
    copied = 0
    missing_image = 0
    missing_anno = 0
    invalid_boxes_total = 0

    for img_name in image_ids:
        if img_name not in raw_annotations:
            missing_anno += 1
            continue

        img_path = image_index.get(img_name)
        if img_path is None:
            missing_image += 1
            continue

        # Load image (force RGB for consistency)
        img = Image.open(img_path).convert("RGB")
        w, h = img.size

        label_path = os.path.join(out_lbl_dir, os.path.splitext(img_name)[0] + ".txt")

        valid_box_count = 0
        with open(label_path, "w") as lf:
            for cat_id, x1, y1, x2, y2 in raw_annotations[img_name]:

                # Clamp to image bounds
                x1 = clamp(x1, 0, w)
                x2 = clamp(x2, 0, w)
                y1 = clamp(y1, 0, h)
                y2 = clamp(y2, 0, h)

                # Skip invalid/degenerate boxes
                if x2 <= x1 or y2 <= y1:
                    invalid_boxes_total += 1
                    continue

                cls = cat_id_to_yolo[cat_id]

                # Convert to YOLO normalized cx,cy,w,h
                x_center = ((x1 + x2) / 2.0) / w
                y_center = ((y1 + y2) / 2.0) / h
                bw = (x2 - x1) / w
                bh = (y2 - y1) / h

                # Extra safety: keep only in-range
                if not (0 <= x_center <= 1 and 0 <= y_center <= 1 and 0 < bw <= 1 and 0 < bh <= 1):
                    invalid_boxes_total += 1
                    continue

                lf.write(f"{cls} {x_center:.6f} {y_center:.6f} {bw:.6f} {bh:.6f}\n")
                valid_box_count += 1

        # Only copy image if at least one valid box remains
        if valid_box_count > 0:
            shutil.copy(img_path, out_img_dir)
            copied += 1
        else:
            # Remove empty label file (YOLO treats no-label as background image; for VFN you said each has ≥1 box,
            # but after filtering invalid boxes, it could happen)
            os.remove(label_path)

    print(f"\n[{split_name}] copied images: {copied}")
    print(f"[{split_name}] skipped (no annotations): {missing_anno}")
    print(f"[{split_name}] skipped (missing image file): {missing_image}")
    print(f"[{split_name}] invalid/filtered boxes: {invalid_boxes_total}")

    return copied

train_copied = process_split(train_ids, OUT_IMAGES_TRAIN, OUT_LABELS_TRAIN, "train")
val_copied   = process_split(val_ids,   OUT_IMAGES_VAL,   OUT_LABELS_VAL,   "val")
test_copied  = process_split(test_ids,  OUT_IMAGES_TEST,  OUT_LABELS_TEST,  "test")


with open(DATA_YAML_PATH, "w") as f:
    f.write(f"path: {OUT_ROOT}\n")
    f.write("train: images/train\n")
    f.write("val: images/val\n")
    f.write("test: images/test\n\n")
    f.write("names:\n")
    for i, name in enumerate(yolo_names):
        # YAML-safe: wrap in quotes
        f.write(f"  {i}: \"{name}\"\n")

print("\nDataset preparation complete.")
print(f"Train images: {train_copied}")
print(f"Validation images: {val_copied}")
print(f"Test images: {test_copied}")
print(f"Total classes: {len(yolo_names)}")
print(f"Wrote: {DATA_YAML_PATH}")