# Cityscape ML Service

Local Python microservice for admin dashboard predictions.

Run from PyCharm or terminal:

```bash
cd ml-service
python app.py
```

The service listens on:

```txt
http://localhost:9100/predict
```

Backend Node sends daily history as JSON. Python returns:

- booking forecast
- revenue forecast
- occupancy forecast

The current model is a lightweight linear-regression baseline implemented without external Python packages. It can later be replaced with pandas/scikit-learn while keeping the same `/predict` contract.
