import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { Map, Users, ShoppingBag, Activity, Upload, Image, MessageCircle, X, ChevronLeft, Mail, Phone, User, LineChart, BarChart, Loader } from 'lucide-react';
import { RiProductHuntLine } from "react-icons/ri";
import { IoMdOptions } from "react-icons/io";
import { FaBook, FaMoneyBillWave, FaUserFriends } from "react-icons/fa";
import PricePrediction from './PricePrediction.jsx';

// Lazy load modal component to improve initial load time
const Modal = lazy(() => import('./Modal'));

// Simple Markdown parser function to convert markdown to HTML
const parseMarkdown = (markdown) => {
  if (!markdown) return '';
  
  let html = markdown
    // Headers
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    
    // Paragraphs
    .replace(/\n\s*\n/g, '</p><p>')
    
    // Line breaks
    .replace(/\n/gim, '<br>');
  
  // Wrap lists in ul/ol tags
  const listItemRegex = /<li>.*?<\/li>/g;
  const listItems = html.match(listItemRegex);
  
  if (listItems) {
    let processedHtml = html;
    const uniqueId = Date.now();
    
    // Replace list items with placeholder
    processedHtml = processedHtml.replace(
      /<li>.*?<\/li>/g, 
      `<ul id="list-${uniqueId}">${listItems.join('')}</ul>`
    );
    
    // Remove duplicate lists (keeping only the first occurrence)
    const placeholder = new RegExp(`<ul id="list-${uniqueId}">.*?</ul>`, 'g');
    const matches = processedHtml.match(placeholder);
    
    if (matches && matches.length > 1) {
      let first = true;
      processedHtml = processedHtml.replace(placeholder, (match) => {
        if (first) {
          first = false;
          return match;
        }
        return '';
      });
    }
    
    html = processedHtml;
  }
  
  // Wrap in paragraph tags if not starting with a block element
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<p>')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(null);

  const [yieldPredForm, setYieldPredForm] = useState({
    crop: '',
    state: '',
    season: '',
    annual_rainfall: 500,
    fertilizer: 100,
    pesticide: 50,
    production: 1000,
    area: 200,
    forecast_years: 3
  });
  const [yieldPredictions, setYieldPredictions] = useState(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const [yieldError, setYieldError] = useState(null);

  const crops = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Jute", "Coffee", "Coconut", "Groundnut"];
  const states = ["Andhra Pradesh", "Assam", "Bihar", "Gujarat", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Tamil Nadu", "Uttar Pradesh", "West Bengal"];
  const seasons = ["Kharif", "Rabi", "Whole Year", "Autumn", "Summer", "Winter"];

  const modalContents = {
    product: {
      title: "Product Features",
      content: (
        <div>
          <h3>AI-Powered Crop Price & Yield Prediction</h3>
          <p>Utilize advanced AI and machine learning algorithms for accurate crop price and yield predictions, combined with in-depth market analysis and historical data trends.</p>
          
          <h3>Crop Disease Detection</h3>
          <p>Leverage cutting-edge technology for early detection of crop diseases, ensuring better yield protection.</p>
          
          <h3>User-Friendly Multilingual Chatbot</h3>
          <p>Get quick and easy-to-understand answers with an intuitive multilingual chatbot designed to assist farmers efficiently.</p>
        </div>
      )
    },
    solutions: {
      title: "Agricultural Solutions",
      content: (
        <div className={styles.solutionsModalContent}>
          <div className={styles.solutionsText}>
            <h3>For Farmers</h3>
            <p>Make informed decisions about when to sell your crops and maximize your profits.</p>
            <h3>For Traders</h3>
            <p>Access market insights and trading opportunities in the agricultural sector.</p>
            <h3>For Businesses</h3>
            <p>Optimize your supply chain and inventory management with our predictive analytics.</p>
          </div>
          <div className={styles.solutionsImageContainer}>
            <img 
              src="/farmer_ghibli.png" 
              alt="Farmer in field" 
              className={styles.solutionsImage} 
            />
            <div className={styles.imageOverlay}></div>
          </div>
        </div>
      )
    },
    resources: {
      title: "Resources",
      content: (
        <div>
          <p className={styles.resourcesParagraph}>The Knowledge Base includes insights from web crawling multiple official government websites related to agriculture in India, along with authoritative datasets such as the Agricultural Crop Yield in Indian States Dataset, the PlantVillage dataset, and the New Plant Diseases dataset. These resources support advanced crop yield forecasting and disease prediction.</p>
        </div>
      )
    },
    pricing: {
      title: "Pricing Plans",
      content: (
        <div className={styles.pricingContent}>
          <div className={styles.pricingItem}>
            <h3>Free Plan</h3>
            <p>• Basic crop price predictions</p>
            <p>• Market trend analysis</p>
            <p>• Essential agricultural insights</p>
            <p>• Community support</p>
          </div>
          <div className={styles.pricingItem}>
            <h3>Pro Plan</h3>
            <p className={styles.comingSoon}>Coming Soon...</p>
          </div>
          <div className={styles.pricingItem}>
            <h3>Advanced Plan</h3>
            <p className={styles.comingSoon}>Coming Soon...</p>
          </div>
        </div>
      )
    },
    contact: {
      title: "Contact",
      content: (
        <div className={styles.contactGrid}>
          <div className={styles.contactItem}>
            <div className={styles.contactHeader}>
              <User className={styles.contactIcon} />
              <h3>Pranav Acharya</h3>
            </div>
            <div className={styles.contactInfo}>
              <p><Phone className={styles.infoIcon} /> +91 7022939074</p>
              <p><Mail className={styles.infoIcon} /> pranavacharya360@gmail.com</p>
            </div>
          </div>

          <div className={styles.contactItem}>
            <div className={styles.contactHeader}>
              <User className={styles.contactIcon} />
              <h3>Shreya Hegde</h3>
            </div>
            <div className={styles.contactInfo}>
              <p><Phone className={styles.infoIcon} /> +91 7618754280</p>
              <p><Mail className={styles.infoIcon} /> shreya.m.hegde@gmail.com</p>
            </div>
          </div>

          <div className={styles.contactItem}>
            <div className={styles.contactHeader}>
              <User className={styles.contactIcon} />
              <h3>Mohul YP</h3>
            </div>
            <div className={styles.contactInfo}>
              <p><Phone className={styles.infoIcon} /> +91 9844012324</p>
              <p><Mail className={styles.infoIcon} /> ypmohul@gmail.com</p>
            </div>
          </div>

          <div className={styles.contactItem}>
            <div className={styles.contactHeader}>
              <User className={styles.contactIcon} />
              <h3>Rishika N</h3>
            </div>
            <div className={styles.contactInfo}>
              <p><Phone className={styles.infoIcon} /> +91 7019825753</p>
              <p><Mail className={styles.infoIcon} /> rishikanaarayan2003@gmail.com</p>
            </div>
          </div>
        </div>
      )
    }
  };

  const navItems = [
    { text: "Product" },
    { text: "Solutions" },
    { text: "Resources" },
    { text: "Pricing" }
  ];

  const sections = [];

  // Add loading state for initial component mount
  const [pageLoading, setPageLoading] = useState(true);
  
  // Effect to handle initial loading
  useEffect(() => {
    // Simulate loading complete after DOM is ready
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(file);
      // Reset prediction when new file is selected
      setPrediction(null);
      setError(null);
    }
  };

  const handleYieldInputChange = (e) => {
    const { name, value } = e.target;
    // Convert numeric values
    const numericFields = ['annual_rainfall', 'fertilizer', 'pesticide', 'production', 'area', 'forecast_years'];
    const newValue = numericFields.includes(name) ? parseFloat(value) : value;
    
    setYieldPredForm({
      ...yieldPredForm,
      [name]: newValue
    });
  };

  const handleYieldPredict = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!yieldPredForm.crop || !yieldPredForm.state || !yieldPredForm.season) {
      setYieldError("Please fill all required fields");
      return;
    }

    setYieldLoading(true);
    setYieldError(null);
    setYieldPredictions(null); // Clear previous predictions

    try {
      console.log("Sending yield prediction request:", yieldPredForm);
      const response = await fetch('http://localhost:8000/predict-yield/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crop: yieldPredForm.crop,
          state: yieldPredForm.state,
          season: yieldPredForm.season,
          annual_rainfall: yieldPredForm.annual_rainfall,
          fertilizer: yieldPredForm.fertilizer,
          pesticide: yieldPredForm.pesticide,
          production: yieldPredForm.production,
          area: yieldPredForm.area,
          forecast_years: yieldPredForm.forecast_years
        }),
      });

      console.log("Response status:", response.status);
      
      const result = await response.json();
      console.log("Yield prediction result:", result);
      
      if (!response.ok) {
        throw new Error(result.detail || `Server error: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.detail || "Prediction failed");
      }
      
      setYieldPredictions(result);
    } catch (error) {
      console.error("Error predicting yield:", error);
      setYieldError(error.message || "Failed to predict crop yield. Please try again.");
    } finally {
      setYieldLoading(false);
    }
  };

  // Add a model status check function
  const checkModelStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/model-status/');
      if (!response.ok) {
        throw new Error(`Failed to check model status: ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error checking model status:", error);
      return { model_loaded: false, api_status: "error" };
    }
  };

  // Update the handlePredict function
  const handlePredict = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingMessage("Preparing for analysis..."); // Initial loading message
    setPrediction(null); // Clear any previous prediction

    // Check model status before uploading
    try {
      const status = await checkModelStatus();
      if (status.api_status !== "active") {
        throw new Error("The prediction service is currently unavailable. Please try again later.");
      }
      
      if (!status.model_loaded) {
        setLoadingMessage("Note: Using fallback prediction mode as the full model couldn't be loaded");
      }
    } catch (error) {
      // Continue even if status check fails, as the API might still work
      console.warn("Model status check failed:", error);
    }

    // Clear prediction after 20 seconds if no response (failsafe)
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setLoadingMessage(null);
        setError("Analysis is taking too long. Please try again.");
      }
    }, 20000);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log("Sending prediction request...");
      
      const loadingMessages = [
        "Analyzing your plant image...",
        "Identifying patterns...", 
        "Running disease detection algorithms...",
        "Almost there..."
      ];
      
      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        if (isLoading && messageIndex < loadingMessages.length) {
          setLoadingMessage(loadingMessages[messageIndex]);
          messageIndex++;
        } else {
          clearInterval(messageInterval);
        }
      }, 1500);

      const response = await fetch('http://localhost:8000/predict/', {
        method: 'POST',
        body: formData,
      });

      console.log("Response status:", response.status);
      
      // Clear the intervals regardless of success/failure
      clearTimeout(timeoutId);
      clearInterval(messageInterval);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Server error: ${response.status} ${response.statusText}`
        }));
        throw new Error(errorData.detail || "Failed to get prediction from server");
      }

      const result = await response.json();
      console.log("Prediction result:", result);
      
      if (!result.success) {
        throw new Error(result.detail || "Prediction failed");
      }
      
      setLoadingMessage(null);
      setPrediction(result);
      
      // Add a message if using fallback prediction
      if (result.is_fallback) {
        setError("Note: Using approximate prediction due to model limitations.");
      }
    } catch (error) {
      console.error("Error predicting disease:", error);
      setLoadingMessage(null);
      setError(error.message || "Failed to predict disease. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChatbot = () => {
    setChatbotOpen(!chatbotOpen);
  };

  const handleClearPrediction = () => {
    setPrediction(null);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
  };

  const handleDownloadReport = () => {
    if (!prediction) return;
    
    // Create report content
    const plantName = prediction.display_name || prediction.prediction.replace(/_/g, ' ').replace(/___/g, ' - ');
    const confidence = (prediction.confidence * 100).toFixed(1);
    const remedy = prediction.remedy || "No specific remedy information available.";
    const impact = prediction.impact || "This condition may affect crop yield and quality if left untreated.";
    const prevention = prediction.prevention || "Maintain proper field hygiene and follow recommended crop rotation practices.";
    
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    
    const reportContent = `
AgroBOT Plant Analysis Report
Generated on: ${reportDate} at ${reportTime}

DIAGNOSIS:
Plant Condition: ${plantName}
Confidence Level: ${confidence}%
${prediction.is_fallback ? 'Note: Using approximate prediction due to model limitations.' : ''}

RECOMMENDED TREATMENT:
${remedy}

POTENTIAL IMPACT:
${impact}

PREVENTION TIPS:
${prevention}

-------------------------------------
Report generated by AgroBOT AI Assistant
`;

    // Create blob and download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Plant_Analysis_${reportDate.replace(/\//g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMoreInfo = () => {
    // We'll simulate opening the chatbot with a pre-filled query
    if (prediction) {
      setChatbotOpen(true);
      // In a real implementation, you might send this to the chatbot
      console.log(`User requested more information about: ${prediction.display_name || prediction.prediction}`);
    }
  };

  // Improved loading indicator component
  const LoadingIndicator = () => (
    <div className={styles.loadingIndicator}>
      <Loader size={30} className={styles.loadingIcon} />
      <span>Loading...</span>
    </div>
  );

  const [modelStatus, setModelStatus] = useState({
    checked: false,
    loaded: false,
    api_active: false
  });

  // Add this to the useEffect hook or create a new one
  useEffect(() => {
    // Check model status when component mounts
    const checkStatus = async () => {
      try {
        const status = await checkModelStatus();
        setModelStatus({
          checked: true,
          loaded: status.model_loaded,
          api_active: status.api_status === "active"
        });
      } catch (error) {
        console.error("Failed to check model status:", error);
        setModelStatus({
          checked: true,
          loaded: false,
          api_active: false
        });
      }
    };
    
    checkStatus();
  }, []);

  // If page is loading, show a loading indicator
  if (pageLoading) {
    return (
      <div className={styles.pageLoadingContainer}>
        <div className={styles.pageLoadingContent}>
          <img 
            src="/AgriLOGO.png" 
            alt="AgroBOT Logo" 
            className={styles.loadingLogo} 
          />
          <h2 className={styles.loadingText}>Loading AgroBOT Dashboard</h2>
          <div className={styles.loadingBar}>
            <div className={styles.loadingProgress}></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.dashboardContainer}>
      {/* Navigation Bar */}
      <header className={styles.header}>
        <div style={{ 
          position: 'absolute', 
          left: '20px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          display: 'flex', 
          alignItems: 'center', 
          zIndex: 101
        }}>
          <div className={styles.backButton} onClick={() => navigate('/')}>
            <ChevronLeft size={20} />
          </div>
          <img 
            src="/AgriLOGO.png" 
            alt="AgroBOT Logo" 
            className={styles.logo} 
          />
          <span className={styles.logoTextGradient}>AgroBOT</span>
        </div>

        <div className={styles.headerContainer}>
          <div style={{ width: '150px' }}></div> {/* Spacer for logo */}
          <nav className={styles.navigation}>
            {navItems.map((item, index) => (
              <div
                key={index}
                className={styles.navItem}
                onClick={() => setActiveModal(item.text.toLowerCase())}
              >
                {item.text}
              </div>
            ))}
          </nav>

          <div className={styles.actionButtons} style={{ marginLeft: 'auto' }}>
            <button className={styles.contactButton} onClick={() => setActiveModal("contact")}>
              Contact
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className={styles.dashboard}>
        <div className={styles.content}>
          <div className={styles.titleSection}>
            <h1 className={styles.gradientTitle}>My Dashboard</h1>
          </div>

          <div className={styles.uploadSection}>
            <div className={styles.uploadCard}>
              <div className={styles.uploadHeader}>
                <div className={styles.sectionTitle}>
                  <Image size={20} />
                  <h3>Image Upload</h3>
                </div>
                {!modelStatus.loaded && modelStatus.checked && (
                  <div className={styles.modelWarning}>
                    <span>AI model in lightweight mode - using fallback predictions</span>
                  </div>
                )}
              </div>
              
              <form className={styles.uploadArea}>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  id="fileInput"
                  className={styles.fileInput}
                  onChange={handleFileChange}
                />
                
                <label htmlFor="fileInput" className={styles.uploadLabel}>
                  {!previewUrl ? (
                    <div className={styles.uploadPlaceholder}>
                      <Upload size={30} />
                      <span>Click to upload an image</span>
                      <span className={styles.uploadSubtext}>PNG, JPG, GIF up to 10MB</span>
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                  )}
                </label>
                
                {selectedFile && (
                  <div className={styles.fileName}>{selectedFile.name}</div>
                )}
                
                {selectedFile && (
                  <button 
                    type="button" 
                    className={styles.predictButton}
                    onClick={handlePredict}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Analyzing...' : 'Analyze Plant'}
                  </button>
                )}
                
                {error && (
                  <div className={styles.errorMessage}>{error}</div>
                )}
                
                {loadingMessage && !error && (
                  <div className={styles.loadingMessage}>{loadingMessage}</div>
                )}
                
                {prediction && (
                  <div className={styles.predictionResult}>
                    <h3 className={styles.predictionTitle}>Plant Analysis Results</h3>
                    <div className={styles.predictionContent}>
                      <div className={styles.diagnosisSection}>
                        <div className={styles.diagnosisHeader}>
                          <h4>Diagnosis</h4>
                          <div className={styles.confidenceBadge}>
                            Confidence: {(prediction.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className={styles.predictionName}>
                          {prediction.display_name || prediction.prediction.replace(/_/g, ' ').replace(/___/g, ' - ')}
                        </div>
                        {prediction.is_fallback && (
                          <div className={styles.fallbackNote}>
                            Note: Using approximate prediction due to model limitations.
                          </div>
                        )}
                      </div>
                      
                      {prediction.remedy && (
                        <div className={styles.remedySection}>
                          <h4>Recommended Treatment</h4>
                          <div 
                            className={styles.remedyContent}
                            dangerouslySetInnerHTML={{ __html: parseMarkdown(prediction.remedy) }}
                          ></div>
                        </div>
                      )}
                      
                      <div className={styles.additionalInfoSection}>
                        <div className={styles.infoCard}>
                          <h4>Potential Impact</h4>
                          <p>{prediction.impact || "This condition may affect crop yield and quality if left untreated."}</p>
                        </div>
                        <div className={styles.infoCard}>
                          <h4>Prevention Tips</h4>
                          <p>{prediction.prevention || "Maintain proper field hygiene and follow recommended crop rotation practices."}</p>
                        </div>
                      </div>
                      
                      <div className={styles.actionButtons}>
                        <button 
                          className={styles.actionButton}
                          onClick={handleDownloadReport}
                        >
                          <span className={styles.actionIcon}>📋</span>
                          Save Report
                        </button>
                        <button 
                          className={styles.actionButton}
                          onClick={handleMoreInfo}
                        >
                          <span className={styles.actionIcon}>🔍</span>
                          More Info
                        </button>
                        <button 
                          className={styles.actionButton}
                          onClick={handleClearPrediction}
                        >
                          <span className={styles.actionIcon}>🔄</span>
                          New Scan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className={styles.yieldPredictionSection}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <LineChart size={20} />
                  <h3>Yield Prediction</h3>
                </div>
              </div>
              
              <form className={styles.yieldForm} onSubmit={handleYieldPredict}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="crop">Crop *</label>
                    <select 
                      id="crop" 
                      name="crop" 
                      value={yieldPredForm.crop}
                      onChange={handleYieldInputChange}
                      required
                      className={styles.formSelect}
                    >
                      <option value="">Select Crop</option>
                      {crops.map(crop => (
                        <option key={crop} value={crop}>{crop}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="state">State *</label>
                    <select 
                      id="state" 
                      name="state" 
                      value={yieldPredForm.state}
                      onChange={handleYieldInputChange}
                      required
                      className={styles.formSelect}
                    >
                      <option value="">Select State</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="season">Season *</label>
                    <select 
                      id="season" 
                      name="season" 
                      value={yieldPredForm.season}
                      onChange={handleYieldInputChange}
                      required
                      className={styles.formSelect}
                    >
                      <option value="">Select Season</option>
                      {seasons.map(season => (
                        <option key={season} value={season}>{season}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="annual_rainfall">Annual Rainfall (mm)</label>
                    <input 
                      type="number" 
                      id="annual_rainfall" 
                      name="annual_rainfall" 
                      value={yieldPredForm.annual_rainfall}
                      onChange={handleYieldInputChange}
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="fertilizer">Fertilizer (kg/ha)</label>
                    <input 
                      type="number" 
                      id="fertilizer" 
                      name="fertilizer" 
                      value={yieldPredForm.fertilizer}
                      onChange={handleYieldInputChange}
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="pesticide">Pesticide (kg/ha)</label>
                    <input 
                      type="number" 
                      id="pesticide" 
                      name="pesticide" 
                      value={yieldPredForm.pesticide}
                      onChange={handleYieldInputChange}
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                    />
                  </div>
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="production">Production (tonnes)</label>
                    <input 
                      type="number" 
                      id="production" 
                      name="production" 
                      value={yieldPredForm.production}
                      onChange={handleYieldInputChange}
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="area">Area (hectares)</label>
                    <input 
                      type="number" 
                      id="area" 
                      name="area" 
                      value={yieldPredForm.area}
                      onChange={handleYieldInputChange}
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="forecast_years">Forecast Years</label>
                    <input 
                      type="number" 
                      id="forecast_years" 
                      name="forecast_years" 
                      value={yieldPredForm.forecast_years}
                      onChange={handleYieldInputChange}
                      min="1"
                      max="10"
                      className={styles.formInput}
                    />
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className={styles.predictButton}
                  disabled={yieldLoading}
                >
                  {yieldLoading ? 'Processing...' : 'Predict Yield'}
                </button>
                
                {yieldError && (
                  <div className={styles.errorMessage}>{yieldError}</div>
                )}
              </form>
              
              {yieldPredictions && (
                <div className={styles.predictionResults}>
                  <h4 className={styles.resultsTitle}>
                    Yield Predictions for {yieldPredictions.crop} in {yieldPredictions.state}
                  </h4>
                  
                  <div className={styles.resultsTable}>
                    <div className={styles.tableHeader}>
                      <div className={styles.tableCell}>Year</div>
                      <div className={styles.tableCell}>Predicted Yield (kg/ha)</div>
                    </div>
                    {yieldPredictions.predictions.map(pred => (
                      <div key={pred.year} className={styles.tableRow}>
                        <div className={styles.tableCell}>{pred.year}</div>
                        <div className={styles.tableCell}>{pred.yield.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.pricePredictionSection}>
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  <FaMoneyBillWave size={20} />
                  <h3>Price Prediction</h3>
                </div>
              </div>
              
              <PricePrediction />
            </div>
          </div>
        </div>
        
        <div className={styles.visualization}>
          <div className={styles.gradientOverlay}></div>
          <img 
            src="/crop_ghibli.png" 
            alt="Agricultural Visualization" 
            className={styles.visualImage}
          />
        </div>
      </div>

      {/* Chatbot Icon */}
      <button 
        className={styles.chatbotButton} 
        onClick={toggleChatbot}
        aria-label="Open chat assistant"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chatbot Modal */}
      {chatbotOpen && (
        <div className={styles.chatbotModal}>
          <div className={styles.chatbotHeader}>
            <button 
              className={styles.chatbotCloseButton} 
              onClick={toggleChatbot}
              aria-label="Close chat"
            >
              <X size={24} />
            </button>
          </div>
          <div className={styles.chatbotContent}>
            <iframe
              src="https://www.chatbase.co/chatbot-iframe/0j4hiNcNmRDFkQKpYEiOR"
              width="100%"
              height="100%"
              frameBorder="0"
              className={styles.chatbotIframe}
              title="AgroBOT Assistant"
              style={{ 
                marginBottom: "-40px", 
                height: "calc(100% + 40px)",
                display: "block",
                border: "none",
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                overflow: "hidden"
              }}
            ></iframe>
          </div>
        </div>
      )}

      {/* Wrap modals with Suspense for better loading */}
      <Suspense fallback={<LoadingIndicator />}>
        {Object.entries(modalContents).map(([key, { title, content }]) => (
          <Modal
            key={key}
            isOpen={activeModal === key}
            onClose={() => setActiveModal(null)}
            title={title}
          >
            {content}
          </Modal>
        ))}
      </Suspense>
    </div>
  );
} 