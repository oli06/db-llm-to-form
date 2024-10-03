
window.addEventListener('DOMContentLoaded', (event) => {
    // Select the form with the class 'quick-finder__form'
    setTimeout(() => {    
        const quickFinderForm = document.querySelector('.quick-finder__content-wrapper');

        if (quickFinderForm) {
            // Create a new div to hold the input field
            const inputContainer = document.createElement('div');
            // inputContainer.style.marginBottom = '10px';
            inputContainer.style.display = 'flex';
            inputContainer.style.padding = '10px';
            // Create the input field
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.placeholder = 'Auto-focused input';
            inputField.id = 'custom-input-field';
            inputField.style.width = '100%';
            inputField.style.padding = '8px';
            inputField.style.fontSize = '16px';

            // Insert the new input field above the quick-finder__form
            inputContainer.appendChild(inputField);

            const searchButton = document.createElement('button');
            searchButton.textContent = 'Los gehts!';
            searchButton.style.padding = '8px';
            searchButton.style.fontSize = '16px';
            searchButton.style.marginLeft = '10px';
            searchButton.style.cursor = 'pointer';
            searchButton.style.backgroundColor = '#0078d4';
            searchButton.style.color = 'white';
            searchButton.id = 'custom-search-button';

            searchButton.addEventListener('click', () => {

                // Create a loading circle element
                const loadingCircle = document.createElement('div');
                loadingCircle.id = 'loading-circle';
                loadingCircle.style.border = '16px solid #f3f3f3';
                loadingCircle.style.borderTop = '16px solid #3498db';
                loadingCircle.style.borderRadius = '50%';
                loadingCircle.style.width = '24px';
                loadingCircle.style.height = '24px';
                loadingCircle.style.animation = 'spin 2s linear infinite';
                loadingCircle.style.position = 'absolute';
                loadingCircle.style.top = '50%';
                loadingCircle.style.left = '50%';
                loadingCircle.style.transform = 'translate(-50%, -50%)';
                document.body.appendChild(loadingCircle);

                // Add CSS for the loading circle animation
                const style = document.createElement('style');
                style.type = 'text/css';
                style.innerHTML = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }`;
                document.head.appendChild(style);

                inputField.disabled = true;
                const userInput = inputField.value;
        
                // Check if the input is not empty
                if (userInput.trim()) {
                    // Send user input to the background script
                    chrome.runtime.sendMessage({ action: 'searchBahn', userInput }, async function(response) {
                        console.log(response);
                        if (response && response.result) {
                            try {
                                const result = JSON.parse(response.result);
                                if(result.von) {
                                    const vonFromSearch = await getLocationMatch(result.von);
                                    if(vonFromSearch) {
                                        updateVonOrNach(vonFromSearch, 'von');
                                    }
                                }

                                if(result.nach) {
                                    const nachFromSearch = await getLocationMatch(result.nach);
                                    if(nachFromSearch) {
                                        updateVonOrNach(nachFromSearch, 'nach');
                                    }
                                }

                                if(result.zeitpunkt) {
                                    updateHinfahrt(result.zeitpunkt, result.abfahrt ?? 'ABFAHRT');
                                }

                                if(result.reisende && result.reisende.length > 0) {
                                    updateReisende(result.reisende);
                                }

                            } catch (error) {
                                console.error("Error parsing response:", error);
                            }
                        } else {
                            console.error("No response from OpenAI API");
                        }
                    });
                }

                document.body.removeChild(loadingCircle);
                inputField.disabled = false;
            });

            inputContainer.appendChild(searchButton);

            quickFinderForm.insertBefore(inputContainer, quickFinderForm.firstChild);

            // Autofocus the input field
            inputField.focus();
        }
    }, 3000);
});

function updateReisende(reisende) {
    // Step 1: Get the vuex object from sessionStorage
    const vuexData = sessionStorage.getItem('vuex');

    if (!vuexData) {
        console.error('vuex key does not exist in sessionStorage');
        return;
    }

    // Step 2: Parse the vuexData JSON string into an object
    let vuexObj = JSON.parse(vuexData);

    // Check if reiseloesungSucheState exists
    if (vuexObj.reiseloesungSucheState) {
        // Step 3: Update the reisende field with the provided array of passengers
        vuexObj.reiseloesungSucheState.reisende = reisende;

        // Step 4: Convert the modified vuex object back to JSON
        const updatedVuexData = JSON.stringify(vuexObj);

        // Step 5: Store the updated vuex object back into sessionStorage
        sessionStorage.setItem('vuex', updatedVuexData);

        console.log('Successfully updated reisende field in vuex.');
    } else {
        console.error('reiseloesungSucheState does not exist in vuex object.');
    }
}

function updateHinfahrt(zeitpunkt, ankunftSuche) {
    // Step 1: Get the vuex object from sessionStorage
    const vuexData = sessionStorage.getItem('vuex');

    if (!vuexData) {
        console.error('vuex key does not exist in sessionStorage');
        return;
    }

    // Step 2: Parse the vuexData JSON string into an object
    let vuexObj = JSON.parse(vuexData);

    // Check if reiseloesungSucheState and hinfahrt exist
    if (vuexObj.reiseloesungSucheState && vuexObj.reiseloesungSucheState.hinfahrt) {
        // Step 3: Update the hinfahrt.zeitpunkt with the given datetime string (yyyy-mm-ddThh:mm:ss)
        vuexObj.reiseloesungSucheState.hinfahrt.zeitpunkt = zeitpunkt;

        // Step 4: Update the hinfahrt.ankunftSuche based on the provided parameter
        if (ankunftSuche === "ABFAHRT" || ankunftSuche === "ANKUNFT") {
            vuexObj.reiseloesungSucheState.hinfahrt.ankunftSuche = ankunftSuche;
        } else {
            console.error('Invalid value for ankunftSuche. Use "ABFAHRT" or "ANKUNFT".');
            return;
        }

        // Step 5: Convert the modified vuex object back to JSON
        const updatedVuexData = JSON.stringify(vuexObj);

        // Step 6: Store the updated vuex object back into sessionStorage
        sessionStorage.setItem('vuex', updatedVuexData);

        console.log('Successfully updated hinfahrt field in vuex.');
    } else {
        console.error('hinfahrt field does not exist in reiseloesungSucheState.');
    }
}

async function getLocationMatch(suchbegriff) {
    // Construct the API URL dynamically using the input string
    const url = `https://www.bahn.de/web/api/reiseloesung/orte?suchbegriff=${encodeURIComponent(suchbegriff)}&typ=ALL&limit=1`;

    try {
        // Send the GET request to the API
        const response = await fetch(url);

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Check if there are any results and return the first one
        if (data.length > 0) {
            return data[0];  // Return the first match
        } else {
            return null;  // No matches found
        }
    } catch (error) {
        console.error('Error fetching the data:', error);
        return null;  // Return null if there's an error
    }
}

function updateVonOrNach(newLocation, field) {
    // Step 1: Get the vuex object from sessionStorage
    const vuexData = sessionStorage.getItem('vuex');

    if (!vuexData) {
        console.error('vuex key does not exist in sessionStorage');
        return;
    }

    // Step 2: Parse the vuexData JSON string into an object
    let vuexObj = JSON.parse(vuexData);

    // Check if reiseloesungSucheState exists
    if (vuexObj.reiseloesungSucheState) {
        // Step 3: Update the "von" or "nach" field based on the input parameter
        if (field === "von") {
            vuexObj.reiseloesungSucheState.von = newLocation;
        } else if (field === "nach") {
            vuexObj.reiseloesungSucheState.nach = newLocation;
        } else {
            console.error('Invalid field. Use "von" or "nach".');
            return;
        }

        // Step 4: Convert the modified vuex object back to JSON
        const updatedVuexData = JSON.stringify(vuexObj);

        // Step 5: Store the updated vuex object back into sessionStorage
        sessionStorage.setItem('vuex', updatedVuexData);

        console.log(`Successfully updated ${field} field in vuex.`);
    } else {
        console.error('reiseloesungSucheState does not exist in vuex object.');
    }
}