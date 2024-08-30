// script.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictForm');
    const predictionOutput = document.getElementById('predictionOutput');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the default form submission

        // Get form data
        const rainfall = document.getElementById('rainfall').value;
        const hydrogeology = document.getElementById('hydrogeology').value;
        const landuse = document.getElementById('landuse').value;
        const population = document.getElementById('population').value;
        const surfaceElevation = document.getElementById('surfaceElevation').value;
        const naturalFeatures = document.getElementById('naturalFeatures').value;
        const tidalCycles = document.getElementById('tidalCycles').value;

        // Example prediction logic (customize as needed)
        const prediction = `Based on the input data:
        - Rainfall: ${rainfall}
        - Hydrogeology: ${hydrogeology}
        - Land Use: ${landuse}
        - Population Density: ${population}
        - Surface Elevation: ${surfaceElevation}
        - Natural Features: ${naturalFeatures}
        - Tidal Cycles: ${tidalCycles}

        The predicted groundwater level is: [Your Prediction Here].`;

        // Display the result
        predictionOutput.textContent = prediction;
    });
});
