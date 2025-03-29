import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { Map, Users, ShoppingBag, Activity, Upload, Image, MessageCircle, X, ChevronLeft, Mail, Phone, User, LineChart, BarChart } from 'lucide-react';
import Modal from './Modal';
import { RiProductHuntLine } from "react-icons/ri";
import { IoMdOptions } from "react-icons/io";
import { FaBook, FaMoneyBillWave, FaUserFriends } from "react-icons/fa";

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
        <div>
          <h3>For Farmers</h3>
          <p>Make informed decisions about when to sell your crops and maximize your profits.</p>
          <h3>For Traders</h3>
          <p>Access market insights and trading opportunities in the agricultural sector.</p>
          <h3>For Businesses</h3>
          <p>Optimize your supply chain and inventory management with our predictive analytics.</p>
        </div>
      )
    },
    resources: {
      title: "Learning Resources",
      content: (
        <div>
          <h3>Knowledge Base</h3>
          <p>Access our comprehensive library of agricultural market insights and guides.</p>
          <h3>Market Reports</h3>
          <p>Download detailed reports about crop prices and market trends.</p>
          <h3>Training Materials</h3>
          <p>Learn how to use our platform effectively with our training resources.</p>
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

  const sections = [
    { title: 'Customers', content: 'No customers', icon: <Users size={20} /> },
    { title: 'Top products', content: 'No products', icon: <ShoppingBag size={20} /> }
  ];

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

  const handlePredict = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log("Sending prediction request...");
      const response = await fetch('http://localhost:8000/predict/', {
        method: 'POST',
        body: formData,
      });

      console.log("Response status:", response.status);
      
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
      
      setPrediction(result);
    } catch (error) {
      console.error("Error predicting disease:", error);
      setError(error.message || "Failed to predict disease. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChatbot = () => {
    setChatbotOpen(!chatbotOpen);
  };

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
                
                {prediction && (
                  <div className={styles.predictionResult}>
                    <div className={styles.predictionTitle}>Plant Analysis Result:</div>
                    <div className={styles.predictionName}>
                      {prediction.prediction.replace(/_/g, ' ').replace(/___/g, ' - ')}
                    </div>
                    <div className={styles.predictionConfidence}>
                      Confidence: {(prediction.confidence * 100).toFixed(1)}%
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

          <div className={styles.sectionsGrid}>
            {sections.map((section, index) => (
              <div key={index} className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitle}>
                    {section.icon}
                    <h3>{section.title}</h3>
                  </div>
                </div>
                <p className={styles.sectionContent}>{section.content}</p>
              </div>
            ))}
          </div>

          <div className={styles.behaviorSection}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Activity size={20} />
                <h3>Activity</h3>
              </div>
              <span className={styles.timeLabel}>10 min</span>
            </div>
            <p className={styles.sectionContent}>No recent activity to show</p>
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

      {/* Modals */}
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
    </div>
  );
} 