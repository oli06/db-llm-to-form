// Function to call OpenAI API with user input and system prompt
async function callOpenAIAPI(userInput) {
    const apiKey = 'YOUR_API';
    const currentTimestamp = new Date().toISOString();
    const systemPrompt = `Der Nutzer möchte eine Bahnverbindung suchen und nutzt dafür ein Texteingabefeld. Deine Aufgabe ist es diese Texteingabe auf die passenden Felder für die Bahn Suche zu mappen. Gebe ein json zurück, das folgendermaßen aussieht. Lasse Felder leer, die nicht vom Nutzer angegeben wurden. \n
    {
        "von": string;
        "nach": string;
        "zeitpunkt": string; // Zeitpunkt der Abfahrt oder Ankunft im Format YYYY-MM-DDTHH:MM:SS (heute ist ${currentTimestamp})
        "abfahrt": string; // entweder ABFAHRT oder ANKUNFT
        "reisende": {
            "ermaessigungen": {
                "art": string; // entweder BAHNCARD25, BAHNCARD50, BAHNCARD100 oder KEINE_ERMAESSIGUNG (default KEINE_ERMAESSIGUNG)
                "klasse": string; // KLASSE_1 oder KLASSE_2 (default KLASSE_2 falls Klasse nicht explizit genannt) oder KLASSENLOS (falls KEINE_ERMAESSIGUNG)
            }[],
            "typ": string; // entweder JUGENDLICHER (bis 27 Jahre), ERWACHSENER, SENIOR (ab 65 Jahr) oder FAHRRAD (Falls Fahrrad dann KEINE_ERMAESSIGUNG und KLASSENLOS bei Art und Klasse von Ermaessigungen) oder FAMILIENKIND (bis 15 Jahre)
            "anzahl": number; // Anzahl der Reisenden dieses Typs (default 1)
            "alter": [] //always an empty array
        }[],
    }`;

    const url = 'https://api.openai.com/v1/chat/completions';

    const data = {
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userInput
            }
        ],
        max_tokens: 500,
        n: 1,
        stop: null,
        temperature: 0.7
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        return result.choices[0].message.content;
    } catch (error) {
        console.error("Error accessing OpenAI API:", error);
        return null;
    }
}

// Listen for messages from content script to trigger API call
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'searchBahn') {
        const userInput = request.userInput;
        callOpenAIAPI(userInput).then(response => {
            sendResponse({ result: response });
        });
        return true; // Required to use async sendResponse
    }
});
