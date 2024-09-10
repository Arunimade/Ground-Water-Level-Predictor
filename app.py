# app.py (Flask Server)
from flask import Flask, request, jsonify
import pickle
import numpy as np

app = Flask(__name__)

# Load the trained model
with open('model.pkl', 'rb') as f:
    model = pickle.load(f)

# Endpoint to handle prediction requests
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json

    # Extract features from the request
    features = [
        data['rainfall'],
        data['hydrogeology'],
        data['landuse'],
        data['population'],
        data['surfaceElevation'],
        data['naturalFeatures'],
        data['tidalCycles']
    ]

    # Convert to a format the model can handle (e.g., numerical encoding)
    # Assuming all input features are already numerical or properly encoded
    prediction = model.predict([features])

    # Send back the prediction result
    return jsonify({'prediction': prediction[0]})

if __name__ == '__main__':
    app.run(debug=True)
