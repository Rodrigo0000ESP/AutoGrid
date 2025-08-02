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
export async function saveJobOffer({ url }) {
    const token = localStorage.getItem("autogrid_token");
    if (!token) throw new Error("Not authenticated");
    
    // Step 1: Scrape the web page
    console.log("🔍 Step 1: Extracting content from the web page...");
    let htmlContent;
    try {
        const isKnownPortal = KNOWN_PORTALS.some(portal => url.toLowerCase().includes(portal));
        
        if (isKnownPortal) {
            console.log("🔹 Known job portal detected, using full HTML for parsing");
            htmlContent = await getActiveTabHTML();
        } else {
            console.log("🔹 Unknown job portal, extracting relevant content");
            htmlContent = await extractRelevantHTML();
        }
        
        if (!htmlContent) {
            throw new Error("Failed to extract HTML content from the page");
        }
        console.log("✅ Successfully extracted HTML content");
        
    } catch (error) {
        console.error("❌ Error extracting content:", error);
        throw new Error(`Failed to extract content: ${error.message}`);
    }
    
    // Step 2: Parse with HTML parser
    console.log("\n🔧 Step 2: Parsing with HTML parser...");
    let parsedHtml;
    try {
        const parseResponse = await fetch(`${API_URL}/jobs/preparse-job-offer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ 
                url, 
                html_content: htmlContent 
            })
        });

        // Get raw response text first for better error handling
        const responseText = await parseResponse.text();
        console.log("🔹 Raw HTML parse response:", responseText);
        
        try {
            parsedHtml = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse JSON response:", e);
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
        }
        
        if (!parseResponse.ok) {
            console.error("API Error:", parsedHtml);
            throw new Error(parsedHtml.detail || "Error parsing job with HTML parser");
        }
        
        console.log("✅ Successfully parsed job with HTML parser");
        
    } catch (error) {
        console.error("❌ Error parsing with HTML parser:", error);
        throw new Error(`Failed to parse job with HTML parser: ${error.message}`);
    }
    
    // Step 3: Enhance with AI
    console.log("\n🤖 Step 3: Enhancing with AI...");
    let enhancedData;
    try {
        const aiResponse = await fetch(`${API_URL}/jobs/parse-job-with-ai`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                url,
                html_content: htmlContent,
                parsed_html: parsedHtml  // Include the HTML parser results
            })
        });

        const responseText = await aiResponse.text();
        console.log("🔹 Raw AI enhancement response:", responseText);
        
        try {
            enhancedData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse AI response:", e);
            throw new Error(`Invalid AI response: ${responseText.substring(0, 100)}...`);
        }
        
        if (!aiResponse.ok) {
            console.error("AI API Error:", enhancedData);
            throw new Error(enhancedData.detail || "Error enhancing job with AI");
        }
        
        console.log("✅ Successfully enhanced job data with AI");
        
    } catch (error) {
        console.error("❌ Error enhancing with AI:", error);
        throw new Error(`Failed to enhance job with AI: ${error.message}`);
    }
    
    // Step 4: Save the job with the enhanced data
    console.log("\n💾 Step 4: Saving job data...");
    try {
        // The enhanced data is in enhancedData.parsed_job_data
        const jobData = enhancedData.parsed_job_data || parsedHtml.parsed_html?.structured_data || {};
        
        // Prepare the job data according to the JobCreate model
        const jobToSave = {
            position: jobData.job_title || parsedHtml.title || "No title available",
            company: jobData.company || "",
            location: jobData.location || "",
            job_type: jobData.job_type || "",
            status: "Saved",  // Must match the JobStatus enum in the backend
            description: jobData.description || "",
            link: url,
            notes: ""
        };

        console.log("🔹 Sending job data to save:", JSON.stringify(jobToSave, null, 2));
        
        const saveResponse = await fetch(`${API_URL}/jobs/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(jobToSave)
        });
        
        if (!saveResponse.ok) {
            const error = await saveResponse.json().catch(() => ({}));
            console.error("❌ Save error response:", error);
            throw new Error(error.detail || "Error saving job offer");
        }
        
        const savedJob = await saveResponse.json();
        console.log("✅ Successfully saved job:", savedJob);
        return savedJob;
        
    } catch (error) {
        console.error("❌ Error saving job:", error);
        
        // Fallback to basic job saving if the main flow fails
        try {
            console.log("🔄 Falling back to basic job saving...");
            const response = await fetch(`${API_URL}/jobs/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    position: parsedHtml?.title || "No title available",
                    company: "",
                    link: url,
                    status: "Saved"  // Must match the JobStatus enum in the backend
                })
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error("❌ Fallback save error:", error);
                throw new Error(error.detail || "Error saving offer in fallback mode");
            }
            
            const fallbackJob = await response.json();
            console.log("✅ Successfully saved job in fallback mode");
            return fallbackJob;
            
        } catch (fallbackError) {
            console.error("❌ Fallback save also failed:", fallbackError);
            throw new Error(`Failed to save job (fallback also failed): ${fallbackError.message}`);
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

    