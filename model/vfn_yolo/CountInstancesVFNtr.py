import matplotlib.pyplot as plt
import numpy as np

labels = r"C:\Users\ricep\Downloads\yolotestlocal\vfn_1_0 (2)\vfn_1_0\Meta\ids.txt"
annotations = r"C:\Users\ricep\Downloads\yolotestlocal\vfn_1_0 (2)\vfn_1_0\Meta\annotations.txt"
testing = r"C:\Users\ricep\Downloads\yolotestlocal\vfn_1_0 (2)\vfn_1_0\Meta\testing.txt"

test_files = set(open(testing).read().splitlines())

graph_names = []
graph_instances = []

names = {}
for line in open(labels):
    items = line.split()
    if len(items) >= 2:
        names[items[0]] = items[1]

counter = {}
for line in open(annotations):
    parts = line.split()
    if parts and parts[0] in test_files: 
        id = parts[-1]
        if id in counter:
            counter[id] = counter[id] + 1
        else:
            counter[id] = 1

for id, count in counter.items():
    food = names.get(id)
    print(food, ":", count)

for id, count in counter.items():
    food = names.get(id)
    graph_names.append(food)
    graph_instances.append(count)

plt.figure(figsize=(12, 18)) 
plt.barh(graph_names, graph_instances)
plt.show()