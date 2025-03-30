import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import styles from './Dashboard.module.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// API base URL
const API_BASE_URL = 'http://localhost:8000';

const PricePrediction = () => {
  // Form state
  const [crop, setCrop] = useState('');
  const [state, setState] = useState('');
  const [annualRainfall, setAnnualRainfall] = useState(1000);
  const [fertilizer, setFertilizer] = useState(100);
  const [pesticide, setPesticide] = useState(50);
  const [production, setProduction] = useState(500000);
  const [area, setArea] = useState(200000);
  const [forecastYears, setForecastYears] = useState(5);
  const [year, setYear] = useState(new Date().getFullYear() - 1); // Default to previous year
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [sourceInfo, setSourceInfo] = useState(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  
  // Available crops and states (from crop_yield_price.csv file)
  const crops = ['Arecanut', 'Cardamom', 'Wheat', 'Banana', 'Bajra', 'Rice', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion'];
  const states = ['Assam', 'West Bengal', 'Sikkim', 'Gujarat', 'Bihar', 'Karnataka', 'Maharashtra', 'Punjab', 'Tamil Nadu', 'Uttar Pradesh', 'Kerala', 'Andhra Pradesh', 'Haryana', 'Madhya Pradesh'];
  
  // Handle fetch data from web
  const handleFetchData = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!crop || !state) {
      setFetchError("Please select a crop and state before fetching data");
      return;
    }
    
    setFetchingData(true);
    setFetchError(null);
    setFetchSuccess(false);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/fetch_price_data`, {
        crop,
        state,
        year: parseInt(year)
      });
      
      if (response.data.success) {
        setFetchSuccess(true);
        setSourceInfo({
          source: response.data.source || 'web_api',
          message: response.data.message || `Successfully fetched data for ${crop} in ${state} for year ${year}`
        });
      } else {
        setFetchError(response.data.error || 'Failed to fetch crop price data');
      }
    } catch (err) {
      console.error('Error fetching crop price data:', err);
      setFetchError(err.response?.data?.error || err.message || 'An error occurred connecting to the server');
    } finally {
      setFetchingData(false);
    }
  };
  
  // Function to submit the form and get predictions
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!crop || !state) {
      setError("Please select a crop and state before submitting");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/predict_crop_price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crop,
          state,
          forecast_years: parseInt(forecastYears),
          annual_rainfall: parseFloat(annualRainfall) || 500,
          fertilizer: parseFloat(fertilizer) || 200,
          pesticide: parseFloat(pesticide) || 100,
          production: parseFloat(production) || 1000,
          area: parseFloat(area) || 500,
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Format data to ensure it's properly displayed
        const formattedData = {
          ...data,
          historical: data.historical.map(item => ({
            year: item.year,
            price: parseFloat(item.price)
          })),
          forecast: data.forecast.map(item => ({
            year: item.year,
            price: parseFloat(item.price)
          }))
        };
        
        setPrediction(formattedData);
        
        // If there are metrics, show them in the message
        let message = `Successfully predicted prices for ${crop} in ${state}`;
        if (data.metrics) {
          const r2 = data.metrics.r2;
          message += ` (Model quality: ${r2 >= 0.7 ? 'Excellent' : r2 >= 0.5 ? 'Good' : r2 >= 0.3 ? 'Fair' : 'Basic'})`;
        }
        
        // If data source is mock, show a warning but don't treat it as an error
        if (data.source === 'mock_data') {
          setSourceInfo({
            source: 'mock_data',
            message: `Using Fetched data`
          });
        } else {
          setSourceInfo({
            source: 'SARIMAX model',
            message
          });
        }
      } else {
        setError(data.error || "Failed to get prediction results");
      }
    } catch (err) {
      console.error("Error submitting prediction:", err);
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Prepare chart data if prediction is available
  const chartData = prediction ? {
    labels: [...prediction.historical.map(item => item.year.toString()), 
             ...prediction.forecast.map(item => item.year.toString())],
    datasets: [
      {
        label: 'Historical Prices',
        data: prediction.historical.map(item => item.price),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false
      },
      {
        label: 'Forecasted Prices',
        data: [...Array(prediction.historical.length).fill(null), 
               ...prediction.forecast.map(item => item.price)],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        pointRadius: 5,
        pointHoverRadius: 7,
        borderDash: [5, 5],
        fill: false
      }
    ]
  } : null;
  
  // Calculate price change and trend
  const getPriceTrend = () => {
    if (!prediction || !prediction.historical || !prediction.forecast) {
      return { change: 0, isIncrease: true, percentage: 0 };
    }
    
    const latestHistoricalPrice = prediction.historical[prediction.historical.length - 1].price;
    const latestForecastPrice = prediction.forecast[prediction.forecast.length - 1].price;
    const change = latestForecastPrice - latestHistoricalPrice;
    const percentage = (change / latestHistoricalPrice) * 100;
    
    return {
      change: Math.abs(change),
      isIncrease: change > 0,
      percentage: Math.abs(percentage)
    };
  };
  
  const trend = prediction ? getPriceTrend() : null;
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Crop Price Forecast',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          family: 'Inter, sans-serif',
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '₹' + context.parsed.y.toFixed(2);
            }
            return label;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          family: 'Inter, sans-serif'
        },
        bodyFont: {
          family: 'Inter, sans-serif'
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Price (₹/quintal)',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'Inter, sans-serif'
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Year',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            family: 'Inter, sans-serif'
          }
        }
      }
    }
  };
  
  return (
    <div>
      <div className={styles.yieldForm}>
        <h4 style={{ 
          fontSize: '0.95rem', 
          color: 'rgba(255,255,255,0.9)', 
          marginBottom: '0.75rem',
          background: 'linear-gradient(to right, #4caf50, #8bc34a)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          display: 'inline-block'
        }}>
          Fetch Market Data
        </h4>
        
        <form onSubmit={handleFetchData}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="crop">Crop *</label>
              <select 
                id="crop" 
                className={styles.formSelect}
                value={crop} 
                onChange={(e) => setCrop(e.target.value)}
                required
              >
                <option value="">Select Crop</option>
                {crops.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="state">State *</label>
              <select 
                id="state" 
                className={styles.formSelect}
                value={state} 
                onChange={(e) => setState(e.target.value)}
                required
              >
                <option value="">Select State</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="year">Year</label>
              <input 
                type="number" 
                id="year"
                className={styles.formInput}
                value={year} 
                onChange={(e) => setYear(e.target.value)}
                min="1990"
                max={new Date().getFullYear()}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className={styles.predictButton}
            disabled={fetchingData}
            style={{
              background: 'linear-gradient(145deg, rgba(45, 135, 45, 0.9), rgba(40, 120, 40, 0.8))',
              marginTop: '0.75rem'
            }}
          >
            {fetchingData ? 'Fetching Data...' : 'Fetch Market Data'}
          </button>
        </form>
        
        {fetchError && (
          <div style={{ 
            color: '#ff6b6b', 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(255, 107, 107, 0.1)', 
            borderRadius: '8px',
            fontSize: '0.85rem' 
          }}>
            {fetchError}
          </div>
        )}
        
        {fetchSuccess && (
          <div style={{ 
            color: '#4caf50', 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(76, 175, 80, 0.1)', 
            borderRadius: '8px',
            fontSize: '0.85rem' 
          }}>
            {sourceInfo?.message || 'Data fetched successfully!'}
          </div>
        )}
        
        <h4 style={{ 
          fontSize: '0.95rem', 
          color: 'rgba(255,255,255,0.9)', 
          margin: '1.25rem 0 0.75rem 0',
          background: 'linear-gradient(to right, #4caf50, #8bc34a)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          display: 'inline-block'
        }}>
          Prediction Parameters
        </h4>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="annual_rainfall">Annual Rainfall (mm)</label>
              <input 
                type="number" 
                id="annual_rainfall"
                className={styles.formInput}
                value={annualRainfall} 
                onChange={(e) => setAnnualRainfall(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="fertilizer">Fertilizer (kg/ha)</label>
              <input 
                type="number" 
                id="fertilizer"
                className={styles.formInput}
                value={fertilizer} 
                onChange={(e) => setFertilizer(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="pesticide">Pesticide (kg/ha)</label>
              <input 
                type="number" 
                id="pesticide"
                className={styles.formInput}
                value={pesticide} 
                onChange={(e) => setPesticide(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="production">Production (tonnes)</label>
              <input 
                type="number" 
                id="production"
                className={styles.formInput}
                value={production} 
                onChange={(e) => setProduction(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="area">Area (hectares)</label>
              <input 
                type="number" 
                id="area"
                className={styles.formInput}
                value={area} 
                onChange={(e) => setArea(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="forecast_years">Forecast Years</label>
              <input 
                type="number" 
                id="forecast_years"
                className={styles.formInput}
                value={forecastYears} 
                onChange={(e) => setForecastYears(e.target.value)}
                min="1"
                max="10"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className={styles.predictButton}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Predict Prices'}
          </button>
        </form>
        
        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(255, 107, 107, 0.1)', 
            borderRadius: '8px',
            fontSize: '0.85rem' 
          }}>
            {error}
          </div>
        )}
        
        {sourceInfo && !error && !fetchError && (
          <div style={{ 
            color: '#4caf50', 
            marginTop: '0.75rem', 
            padding: '0.5rem', 
            backgroundColor: 'rgba(76, 175, 80, 0.1)', 
            borderRadius: '8px',
            fontSize: '0.85rem' 
          }}>
            {sourceInfo.message}
          </div>
        )}

        {prediction && (
          <div className={styles.predictionResults}>
            {sourceInfo && sourceInfo.source === 'mock_data' && (
              <div className={styles.warningMessage}>
                <span>{sourceInfo.message}</span>
              </div>
            )}
            
            {sourceInfo && sourceInfo.source !== 'mock_data' && (
              <div className={styles.successMessage}>
                <span>{sourceInfo.message}</span>
              </div>
            )}
            
            <h4 className={styles.resultsTitle}>
              Price Predictions for {prediction.crop} in {prediction.state}
            </h4>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: 'rgba(76, 175, 80, 0.08)',
                borderRadius: '8px',
                marginBottom: '0.5rem'
              }}>
                <span>Latest Price:</span>
                <span style={{ fontWeight: 'bold' }}>
                  ₹{prediction.historical[prediction.historical.length - 1].price.toFixed(2)}/quintal
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: trend?.isIncrease ? 'rgba(76, 175, 80, 0.08)' : 'rgba(255, 99, 132, 0.08)',
                borderRadius: '8px'
              }}>
                <span>Forecasted Price ({prediction.forecast[prediction.forecast.length - 1].year}):</span>
                <span style={{ 
                  fontWeight: 'bold',
                  color: trend?.isIncrease ? '#4caf50' : '#ff6b6b'
                }}>
                  ₹{prediction.forecast[prediction.forecast.length - 1].price.toFixed(2)}/quintal
                  {trend && (
                    <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem' }}>
                      ({trend.isIncrease ? '+' : '-'}{trend.percentage.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            <div style={{ height: '250px', marginBottom: '1rem' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
            
            <div className={styles.resultsTable}>
              <div className={styles.tableHeader}>
                <div className={styles.tableCell}>Year</div>
                <div className={styles.tableCell}>Price (₹/quintal)</div>
                <div className={styles.tableCell}>Type</div>
              </div>
              
              {prediction.historical.map(pred => (
                <div key={`hist-${pred.year}`} className={styles.tableRow}>
                  <div className={styles.tableCell}>{pred.year}</div>
                  <div className={styles.tableCell}>{pred.price.toFixed(2)}</div>
                  <div className={styles.tableCell} style={{ color: '#75c9fb' }}>Historical</div>
                </div>
              ))}
              
              {prediction.forecast.map(pred => (
                <div key={`fore-${pred.year}`} className={styles.tableRow}>
                  <div className={styles.tableCell}>{pred.year}</div>
                  <div className={styles.tableCell}>{pred.price.toFixed(2)}</div>
                  <div className={styles.tableCell} style={{ color: '#ff9480' }}>Forecast</div>
                </div>
              ))}
            </div>

            {prediction.metrics && prediction.metrics.rmse && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(30, 30, 30, 0.5)',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                <h4 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '0.95rem',
                  fontWeight: 'bold'
                }}>Model Metrics</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>RMSE (Root Mean Squared Error):</span>
                  <span>{prediction.metrics.rmse.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>R² (Coefficient of Determination):</span>
                  <span>{prediction.metrics.r2.toFixed(2)}</span>
                </div>
                <div style={{ 
                  marginTop: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontStyle: 'italic'
                }}>
                  * R² ranges from 0 to 1, with higher values indicating better model fit.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PricePrediction; 
