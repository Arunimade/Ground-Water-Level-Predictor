// script.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predictForm');
    const predictionOutput = document.getElementById('predictionOutput');
    const jsonFile = 'data.json';

    // Fetch JSON data
    fetch(jsonFile)
        .then(response => response.json())
        .then(data => {
            populateDropdown('rainfall', data.rainfallOptions);
            populateDropdown('hydrogeology', data.hydrogeologyOptions);
            populateDropdown('landuse', data.landUseOptions);
            populateDropdown('population', data.populationOptions);
            populateDropdown('surfaceElevation', data.surfaceElevationOptions);
            populateDropdown('naturalFeatures', data.naturalFeaturesOptions);
            populateDropdown('tidalCycles', data.tidalCyclesOptions);
        })
        .catch(error => console.error('Error loading JSON data:', error));

    function populateDropdown(id, options) {
        const select = document.getElementById(id);
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        // Get form data
        const rainfall = document.getElementById('rainfall').value;
        const hydrogeology = document.getElementById('hydrogeology').value;
        const landuse = document.getElementById('landuse').value;
        const population = document.getElementById('population').value;
        const surfaceElevation = document.getElementById('surfaceElevation').value;
        const naturalFeatures = document.getElementById('naturalFeatures').value;
        const tidalCycles = document.getElementById('tidalCycles').value;

        // Create data object to send to the server
        const inputData = {
            rainfall: rainfall,
            hydrogeology: hydrogeology,
            landuse: landuse,
            population: population,
            surfaceElevation: surfaceElevation,
            naturalFeatures: naturalFeatures,
            tidalCycles: tidalCycles
        };

        // Send a POST request to the Flask server
        fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inputData)
        })
        .then(response => response.json())
        .then(data => {
            // Display the prediction result
            const result = `
                <strong>Based on the input data:</strong><br>
                - <strong>Rainfall:</strong> ${rainfall}<br>
                - <strong>Hydrogeology:</strong> ${hydrogeology}<br>
                - <strong>Land Use:</strong> ${landuse}<br>
                - <strong>Population Density:</strong> ${population}<br>
                - <strong>Surface Elevation:</strong> ${surfaceElevation}<br>
                - <strong>Natural Features:</strong> ${naturalFeatures}<br>
                - <strong>Tidal Cycles:</strong> ${tidalCycles}<br><br>
                <strong>The predicted groundwater level is:</strong> ${data.prediction}
            `;
            predictionOutput.innerHTML = result;
        })
        .catch(error => console.error('Error:', error));
    });
});
