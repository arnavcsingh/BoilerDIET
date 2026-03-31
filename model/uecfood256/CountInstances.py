import matplotlib.pyplot as plt
import numpy as np

labels = r"C:\Users\ricep\Downloads\yolotestlocal\vfn_1_0 (2)\vfn_1_0\Meta\category_ids.txt"
annotations = r"C:\Users\ricep\Downloads\yolotestlocal\vfn_1_0 (2)\vfn_1_0\Meta\annotations.txt"

graph_names = []
graph_instances = []
names = {}

for line in open(labels):
    items = line.split()
    if len(items) >= 2:
        names[items[0]] = items[1]

tally = {}

for line in open(annotations):
    parts = line.split()
    if parts:
        id = parts[-1]
        if id in tally:
            tally[id] = tally[id] + 1
        else:
            tally[id] = 1

for id, count in tally.items():
    food = names.get(id)
    print(food, ":", count)

for id, count in tally.items():
    food = names.get(id)
    graph_names.append(food)
    graph_instances.append(count)

plt.figure(figsize=(12, 18)) # This makes the chart tall so labels don't overlap
plt.barh(graph_names, graph_instances)
plt.show()