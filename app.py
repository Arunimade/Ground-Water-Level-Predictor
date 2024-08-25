from flask import Flask, request, jsonify
import numpy as np
import pickle

app = Flask(__name__)

# Load your pre-trained model (ensure you have a model.pkl file)
with open('model.pkl', 'rb') as model_file:
    model = pickle.load(model_file)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    # Extract features from data
    features = np.array([
        data['rainfall'],
        data['population'],
        data['surfaceElevation']
    ]).reshape(1, -1)
    
    # Add any preprocessing required for your model
    prediction = model.predict(features)[0]
    
    return jsonify({'prediction': prediction})

if __name__ == '__main__':
    app.run(debug=True)
