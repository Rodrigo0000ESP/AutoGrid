// API URL para las peticiones al backend
export const API_URL = "http://localhost:8000";

/**
 * Saves a job offer in the backend with the HTML content of the current page.
 * @param {Object} offer - { title, url }
 * @returns {Promise<Object>} - Backend response
 */
export async function saveJobOffer({ title, url }) {
    const token = localStorage.getItem("autogrid_token");
    if (!token) throw new Error("Not authenticated");
    
    try {
        // Step 1: Extract relevant HTML content from the active tab
        const htmlContent = await extractRelevantHTML();
        console.log("Extracted HTML content successfully");
        
        // Step 2: Send to backend for pre-parsing
        console.log("Sending to pre-parser...");
        const preParsedResponse = await fetch(`${API_URL}/jobs/preparse-job-offer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                title, 
                url, 
                html_content: htmlContent 
            })
        });
        
        if (!preParsedResponse.ok) {
            const error = await preParsedResponse.json();
            throw new Error(error.detail || "Error pre-parsing job offer");
        }
        
        const preParsedData = await preParsedResponse.json();
        console.log("Pre-parsing successful");
        
        // Step 3: Send pre-parsed text for AI extraction
        console.log("Sending to AI parser...");
        const aiParseResponse = await fetch(`${API_URL}/jobs/parse-job-with-ai`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                title, 
                url, 
                parsed_text: preParsedData.parsed_text 
            })
        });
        
        if (!aiParseResponse.ok) {
            const error = await aiParseResponse.json();
            throw new Error(error.detail || "Error parsing job with AI");
        }
        
        const parsedJobData = await aiParseResponse.json();
        console.log("AI parsing successful");
        
        // Step 4: Save the fully parsed job data
        console.log("Saving job data...");
        const saveResponse = await fetch(`${API_URL}/jobs/save`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                title, 
                url, 
                parsed_job_data: parsedJobData.parsed_job_data 
            })
        });
        
        if (!saveResponse.ok) {
            const error = await saveResponse.json();
            throw new Error(error.detail || "Error saving job offer");
        }
        
        return await saveResponse.json();
        
    } catch (error) {
        console.error("Error in job saving workflow:", error);
        
        // Fallback to basic job saving if any step fails
        try {
            console.log("Falling back to basic job saving...");
            const response = await fetch(`${API_URL}/jobs/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ title, url })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Error saving offer");
            }
            return await response.json();
        } catch (fallbackError) {
            console.error("Fallback error:", fallbackError);
            throw fallbackError;
        }
    }
}

/**
 * Extracts relevant HTML content from the active tab by injecting a content script
 * that identifies and extracts the main job description block
 * @returns {Promise<string>} - Relevant HTML content
 */
async function extractRelevantHTML() {
    return new Promise((resolve, reject) => {
        // Query for the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                reject("No active tab found");
                return;
            }
            
            const activeTab = tabs[0];
            
            // Execute content script to extract relevant HTML
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                function: extractMainContentBlock
            }, (results) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                    return;
                }
                
                if (!results || results.length === 0) {
                    reject("Failed to extract HTML content");
                    return;
                }
                
                resolve(results[0].result);
            });
        });
    });
}

/**
 * Content script function that runs in the context of the web page
 * to identify and extract the main content block containing job information
 * @returns {string} - HTML content of the main job description block
 */
function extractMainContentBlock() {
    // Common selectors for job description containers
    const jobContentSelectors = [
        // Job specific selectors
        ".job-description",
        "#job-description",
        ".jobsearch-jobDescriptionText", // Indeed
        ".description__text", // LinkedIn
        ".job-details",
        ".job-content",
        ".job-details-content",
        ".job-overview",
        ".job-posting",
        ".job-listing",
        
        // Article/content selectors
        "article",
        "main",
        ".content-main",
        ".main-content",
        
        // Fallback to broader content areas
        ".content", 
        "#content",
        ".container"
    ];
    
    // Try to find the main content element
    let mainContent = null;
    let mainContentHTML = "";
    
    // Try each selector until we find a suitable content block
    for (const selector of jobContentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 200) {
            mainContent = element;
            break;
        }
    }
    
    // If no main content found with selectors, try to find the largest text block
    if (!mainContent) {
        const allElements = document.querySelectorAll("div, section, article");
        let maxTextLength = 0;
        
        allElements.forEach(element => {
            const textLength = element.textContent.trim().length;
            if (textLength > maxTextLength && textLength > 300) {
                maxTextLength = textLength;
                mainContent = element;
            }
        });
    }
    
    // If we found a main content element, get its HTML
    if (mainContent) {
        mainContentHTML = mainContent.outerHTML;
    } else {
        // Fallback to body if no suitable content block found
        mainContentHTML = document.body.outerHTML;
    }
    
    return mainContentHTML;
}

/**
 * Gets the full HTML content of the active tab
 * @returns {Promise<string>} - Full HTML content
 */
async function getActiveTabHTML() {
    return new Promise((resolve, reject) => {
        // Query for the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                reject("No active tab found");
                return;
            }
            
            const activeTab = tabs[0];
            
            // Execute script to get HTML content
            chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                function: () => document.documentElement.outerHTML
            }, (results) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                    return;
                }
                
                if (!results || results.length === 0) {
                    reject("Failed to get HTML content");
                    return;
                }
                
                resolve(results[0].result);
            });
        });
    });
}

export async function register({ username, email, password }) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error registering user");
    }
    const data = await response.json();
    localStorage.setItem("autogrid_token", data.token);
    return data.user;
}

export async function login({ username, password }) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error logging in");
    }
    const data = await response.json();
    localStorage.setItem("autogrid_token", data.token);
    return data.user;
}

export function logout() {
    localStorage.removeItem("autogrid_token");
}

export function isLoggedIn() {
    return !!localStorage.getItem("autogrid_token");
}

/**
 * Requests a password reset for the provided email
 * @param {string} email - User's email
 * @returns {Promise<Object>} - Backend response
 */
export async function forgotPassword(email) {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error requesting password reset");
    }
    return await response.json();
}

/**
 * Resets the password using a token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Backend response
 */
export async function resetPassword(token, newPassword) {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Error resetting password");
    }
    return await response.json();
}

    