def convert_to_grid(latitude: float, longitude: float) -> str:
    grid_size = 0.01

    grid_lat = round(latitude / grid_size) * grid_size
    grid_lon = round(longitude / grid_size) * grid_size

    return f"{grid_lat},{grid_lon}"
