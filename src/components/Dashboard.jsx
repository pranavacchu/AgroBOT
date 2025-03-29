import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { Map, Users, ShoppingBag, Activity, Upload, Image, MessageCircle, X } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);

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
        <div className={styles.headerContainer}>
          <div className={styles.logoContainer} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img 
              src="/AgriLOGO.png" 
              alt="AgroBOT Logo" 
              className={styles.logo} 
            />
            <span className={styles.logoTextGradient}>AgroBOT</span>
          </div>

          <nav className={styles.navigation}>
            {navItems.map((item, index) => (
              <div
                key={index}
                className={styles.navItem}
              >
                {item.text}
              </div>
            ))}
          </nav>

          <div className={styles.actionButtons}>
            <button className={styles.contactButton}>
              Contact
            </button>
          </div>
        </div>
      </header>

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
              <div className={styles.uploadArea}>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <label htmlFor="imageUpload" className={styles.uploadLabel}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                  ) : (
                    <div className={styles.uploadPlaceholder}>
                      <Upload size={32} />
                      <span>Click to upload an image</span>
                      <span className={styles.uploadSubtext}>PNG, JPG, GIF up to 10MB</span>
                    </div>
                  )}
                </label>
                {selectedFile && (
                  <div className={styles.fileName}>
                    {selectedFile.name}
                  </div>
                )}
              </div>
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
            <div className={styles.chatbotHeaderContent}>
              <img 
                src="/AgriLOGO.png" 
                alt="AgroBOT Logo" 
                className={styles.chatbotLogo} 
              />
              <span className={styles.chatbotTitle}>AGROBOT</span>
            </div>
            <button 
              className={styles.chatbotCloseButton} 
              onClick={toggleChatbot}
              aria-label="Close chat"
            >
              <X size={20} />
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
                marginBottom: "-30px", 
                height: "calc(100% + 30px)" 
              }}
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
} 