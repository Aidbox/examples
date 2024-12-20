from datetime import datetime

def now():
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")

def read_csv_as_dict(file_path):
    with open(file_path, mode="r") as file:
        lines = file.readlines()
        keys = lines[0].strip().split(",")
        data = lines[1:]
        result = []
        for line in data:
            values = line.strip().split(",")
            result.append(dict(zip(keys, values)))
        return result


def write_dict_as_csv(data, file_path):
    with open(file_path, mode="w") as file:
        columns = data[0].keys()
        rows = []
        for item in data:
            rows.append(",".join([str(item[column]) for column in columns]))
        file.write(",".join(columns) + "\n")
        file.write("\n".join(rows))
