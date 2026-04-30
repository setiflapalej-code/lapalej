import re
content = 'className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600"'
def replace_grid_cols(m):
    return f"{m.group(1)}grid-cols-1 md:grid-cols-{m.group(2)}"
print(re.sub(r'([\"\'\s])grid-cols-(2|3|4)\b', replace_grid_cols, content))
