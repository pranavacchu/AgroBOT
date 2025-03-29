import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { Map, Users, ShoppingBag, Activity, Upload, Image, MessageCircle, X, ChevronLeft, Mail, Phone, User } from 'lucide-react';
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
    { title: 'Top locations', content: 'No locations', icon: <Map size={20} /> },
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
              </form>
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