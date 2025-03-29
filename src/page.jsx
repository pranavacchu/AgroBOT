import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { Mail, Phone, User } from "lucide-react"
import styles from "./page.module.css"
import Modal from "./components/Modal"
import { RiProductHuntLine } from "react-icons/ri"
import { IoMdOptions } from "react-icons/io"
import { FaBook, FaMoneyBillWave, FaUserFriends } from "react-icons/fa"
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [activeModal, setActiveModal] = useState(null);
  const navigate = useNavigate();

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

  return (
    <div className={styles.container}>
      {/* Navigation Bar */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.logoContainer}>
            <img src="AgriLOGO.png" alt="AgriBOT Logo" className={styles.logo} />
          </div>

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

          <div className={styles.actionButtons}>
            <button className={styles.contactButton} onClick={() => setActiveModal("contact")}>
              Contact
            </button>
            <button className={styles.ctaButton} onClick={() => navigate('/dashboard')}>
              Start for Free
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className={styles.main}>
        <div className={styles.heroSection}>
          <div className={styles.heroContainer}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroTitle}>
                <span className={styles.gradientText}>Predict Crop Prices Like Never Before</span>
              </h1>
              <p className={styles.heroDescription}>
                Your intelligent companion for accurate crop price predictions and market insights. Make data-driven
                decisions for better agricultural returns.
              </p>
              <div className={styles.buttonContainer}>
                <button 
                  className={styles.primaryButton}
                  onClick={() => navigate('/dashboard')}
                >
                  Let&apos;s Get Started
                </button>
              </div>

              <div className={styles.disclaimer}>
                <p>* No credit card needed. Free plan available.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

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
  )
}

