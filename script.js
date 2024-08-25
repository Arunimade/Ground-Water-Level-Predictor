document.getElementById('predictForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    fetch('/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('predictionOutput').textContent = `Predicted Ground Water Level: ${data.prediction} meters`;
    })
    .catch(error => {
        console.error('Error:', error);
    });
});
