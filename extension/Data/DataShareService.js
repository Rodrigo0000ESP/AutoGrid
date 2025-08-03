// API URL para las peticiones al backend
const API_URL = "http://localhost:8000";

// Known job portals (moved from constants for compatibility)
const KNOWN_PORTALS = [
    "linkedin",
    "indeed", 
    "glassdoor",
    "monster",
    "ziprecruiter"
];

/**
 * Saves a job offer in the backend with the HTML content of the current page.
 * @param {Object} offer - { title, url }
 * @returns {Promise<Object>} - Backend response
 */
/**
 * Saves a job offer in the backend with the HTML content of the current page.
 * @param {Object} offer - { title, url }
 * @returns {Promise<Object>} - Backend response
 */
/**
 * Saves a job offer by following the complete flow:
 * 1. Scrape the web page for content
 * 2. Parse with HTML parser
 * 3. Enhance with AI
 * 4. Save the job with the enhanced data
 * @param {Object} param0 - Object containing title and url of the job
 * @returns {Promise<Object>} - The saved job data
 */
export async function saveJobOffer({ url, title }) {
    const token = localStorage.getItem("autogrid_token");
    if (!token) throw new Error("Not authenticated");

    // Step 1: Get HTML content from the active tab
    console.log("🔍 Extracting HTML content from the page...");
    const htmlContent = await getActiveTabHTML();
    if (!htmlContent) {
        throw new Error("Failed to extract HTML content from the page");
    }

    // Step 2: Call the consolidated workflow endpoint
    console.log("🚀 Sending job offer to the backend for processing...");
    try {
        const response = await fetch(`${API_URL}/jobs/workflow`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                url,
                title,
                html_content: htmlContent
            })
        });

        const savedJob = await response.json();

        if (!response.ok) {
            throw new Error(savedJob.detail || "Failed to save job offer.");
        }

        console.log("✅ Successfully processed and saved job offer:", savedJob);
        return savedJob;

    } catch (error) {
        console.error("❌ Error during job offer workflow:", error);
        throw new Error(`Failed to save job offer: ${error.message}`);
    }
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

    