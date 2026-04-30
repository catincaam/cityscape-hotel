from datetime import datetime, timedelta


def _num(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _linear_forecast(values, horizon=7, minimum=0.0, maximum=None):
    clean = [_num(value) for value in values]
    if not clean:
        return [minimum for _ in range(horizon)]

    if len(clean) == 1:
        baseline = max(minimum, clean[0])
        return [baseline for _ in range(horizon)]

    n = len(clean)
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(clean) / n
    denom = sum((x - mean_x) ** 2 for x in xs) or 1
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, clean)) / denom
    intercept = mean_y - slope * mean_x

    recent_window = clean[-min(7, n):]
    recent_average = sum(recent_window) / len(recent_window)
    predictions = []

    for step in range(1, horizon + 1):
        linear_value = intercept + slope * (n - 1 + step)
        value = (linear_value * 0.65) + (recent_average * 0.35)
        value = max(minimum, value)
        if maximum is not None:
            value = min(maximum, value)
        predictions.append(value)

    return predictions


def _label_days(last_date, horizon=7):
    try:
        start = datetime.fromisoformat(last_date).date()
    except (TypeError, ValueError):
        start = datetime.today().date()

    return [
        (start + timedelta(days=step)).isoformat()
        for step in range(1, horizon + 1)
    ]


def build_predictions(payload):
    history = payload.get("history", [])
    horizon = int(payload.get("horizon", 7))
    last_date = history[-1]["date"] if history else None
    labels = _label_days(last_date, horizon)

    bookings = [_num(row.get("bookings")) for row in history]
    revenue = [_num(row.get("revenue")) for row in history]
    occupancy = [_num(row.get("occupancyRate")) for row in history]

    booking_values = _linear_forecast(bookings, horizon=horizon, minimum=0)
    revenue_values = _linear_forecast(revenue, horizon=horizon, minimum=0)
    occupancy_values = _linear_forecast(occupancy, horizon=horizon, minimum=0, maximum=100)

    booking_forecast = [
        {"date": date, "value": round(value)}
        for date, value in zip(labels, booking_values)
    ]
    revenue_forecast = [
        {"date": date, "value": round(value, 2)}
        for date, value in zip(labels, revenue_values)
    ]
    occupancy_forecast = [
        {"date": date, "value": round(value)}
        for date, value in zip(labels, occupancy_values)
    ]

    average_booking_forecast = (
        sum(item["value"] for item in booking_forecast) / len(booking_forecast)
        if booking_forecast else 0
    )
    low_occupancy_days = [
        item for item in occupancy_forecast
        if item["value"] < 45
    ]

    return {
        "model": "linear-regression-baseline",
        "horizonDays": horizon,
        "bookingForecast": booking_forecast,
        "revenueForecast": revenue_forecast,
        "revenueTotal": round(sum(item["value"] for item in revenue_forecast), 2),
        "occupancyForecast": occupancy_forecast,
        "insights": {
            "bookingTrend": "up" if booking_forecast[-1]["value"] >= average_booking_forecast else "down",
            "lowOccupancyDate": low_occupancy_days[0]["date"] if low_occupancy_days else None,
            "lowOccupancyValue": low_occupancy_days[0]["value"] if low_occupancy_days else None
        }
    }
