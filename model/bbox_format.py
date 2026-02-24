from PIL import Image

for i in range(1, 257):

    bb_path = rf"C:\Users\ricep\Downloads\uecformat\dataset256\UECFOOD256\{i}\bb_info.txt"
    upd_path = rf"C:\Users\ricep\Downloads\uecformat\dataset256\UECFOOD256\{i}\bb_upd.txt"

    with open(upd_path, "w") as file:
        file.write("img x_center y_center box_w box_h\n")

    with open(bb_path, "r") as file:
        next(file)
        for line in file:
            values = line.strip().split()

            img, x1, y1, x2, y2 = values

            img = int(img)
            x1 = float(x1)
            y1 = float(y1)
            x2 = float(x2)
            y2 = float(y2)
            print(rf"Initial Values: {img}, {x1}, {y1}, {x2}, {y2}")
            img_path = rf"C:\Users\ricep\Downloads\uecformat\dataset256\UECFOOD256\{i}\{img}.jpg"
            image = Image.open(img_path) 
            width, height = image.size
            print(f"{width}, {height}")
            x_center = ((x1 + x2) / 2) / width
            y_center = ((y1 + y2) / 2) / height
            box_w = (x2 - x1) / width
            box_h = (y2 - y1) / height

            print(rf"Center at ({(round(x_center,6))}, {(round(y_center,6))}) Width and Height are {(round(box_w,6))} and {(round(box_h,6))}")
            
            new_values = str(f"{int(img)} {round(x_center,6)} {round(y_center,6)} {round(box_w,6)} {round(box_h,6)}\n")

            print(new_values)

            with open(upd_path, "a") as upd:
                upd.write(new_values)

            