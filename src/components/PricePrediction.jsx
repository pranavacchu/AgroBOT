import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

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
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [sourceInfo, setSourceInfo] = useState(null);
  
  // Available crops and states (from crop_yield_price.csv file)
  const crops = ['Arecanut', 'Cardamom', 'Wheat', 'Banana', 'Bajra', 'Rice', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion'];
  const states = ['Assam', 'West Bengal', 'Sikkim', 'Gujarat', 'Bihar', 'Karnataka', 'Maharashtra', 'Punjab', 'Tamil Nadu', 'Uttar Pradesh', 'Kerala', 'Andhra Pradesh', 'Haryana', 'Madhya Pradesh'];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);
    setSourceInfo(null);
    
    try {
      // First check for the most recent data year
      const currentYear = new Date().getFullYear();
      const response = await axios.post(`${API_BASE_URL}/predict_crop_price`, {
        crop,
        state,
        annual_rainfall: parseFloat(annualRainfall),
        fertilizer: parseFloat(fertilizer),
        pesticide: parseFloat(pesticide),
        production: parseFloat(production),
        area: parseFloat(area),
        forecast_years: parseInt(forecastYears)
      });
      
      if (response.data.success) {
        setPrediction(response.data);
        if (response.data.source) {
          setSourceInfo({
            source: response.data.source,
            message: response.data.message || `Data from ${response.data.source}`
          });
        }
      } else {
        setError(response.data.error || 'Failed to predict crop prices');
      }
    } catch (err) {
      console.error('Error predicting crop prices:', err);
      setError(err.response?.data?.error || err.message || 'An error occurred connecting to the server');
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
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Crop Price Forecast'
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
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Price (₹/quintal)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Year'
        }
      }
    }
  };
  
  return (
    <Container className="my-4">
      <h2 className="text-center mb-4">Crop Price Prediction</h2>
      
      <Row>
        <Col md={5}>
          <Card className="shadow-sm">
            <Card.Body>
              <h4 className="card-title mb-3">Input Parameters</h4>
              
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Crop</Form.Label>
                      <Form.Select 
                        value={crop} 
                        onChange={(e) => setCrop(e.target.value)}
                        required
                      >
                        <option value="">Select Crop</option>
                        {crops.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State</Form.Label>
                      <Form.Select 
                        value={state} 
                        onChange={(e) => setState(e.target.value)}
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Annual Rainfall (mm)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={annualRainfall} 
                    onChange={(e) => setAnnualRainfall(e.target.value)}
                    required
                    min="0"
                  />
                </Form.Group>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fertilizer (kg/hectare)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={fertilizer} 
                        onChange={(e) => setFertilizer(e.target.value)}
                        required
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pesticide (kg/hectare)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={pesticide} 
                        onChange={(e) => setPesticide(e.target.value)}
                        required
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Production (tonnes)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={production} 
                        onChange={(e) => setProduction(e.target.value)}
                        required
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Area (hectares)</Form.Label>
                      <Form.Control 
                        type="number" 
                        value={area} 
                        onChange={(e) => setArea(e.target.value)}
                        required
                        min="0"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-3">
                  <Form.Label>Forecast Years</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={forecastYears} 
                    onChange={(e) => setForecastYears(e.target.value)}
                    required
                    min="1"
                    max="10"
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span className="ms-2">Predicting...</span>
                    </>
                  ) : 'Predict Prices'}
                </Button>
              </Form>
              
              {sourceInfo && (
                <Alert variant="info" className="mt-3 small">
                  <strong>Data Source:</strong> {sourceInfo.message}
                </Alert>
              )}
              
              {prediction && prediction.model_info && (
                <div className="mt-3 small text-muted">
                  <strong>Model Info:</strong> {prediction.model_info.order}
                  {prediction.model_info.aic && (
                    <span>, AIC: {prediction.model_info.aic.toFixed(2)}</span>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={7}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <h4 className="card-title mb-3">Price Forecast Results</h4>
              
              {error && (
                <Alert variant="danger">{error}</Alert>
              )}
              
              {loading && (
                <div className="text-center my-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-3">Analyzing historical data and generating forecast...</p>
                </div>
              )}
              
              {!loading && !error && prediction && (
                <>
                  <div className="mb-4">
                    <Alert variant="success">
                      <strong>Crop:</strong> {prediction.crop.charAt(0).toUpperCase() + prediction.crop.slice(1)}<br />
                      <strong>State:</strong> {prediction.state.charAt(0).toUpperCase() + prediction.state.slice(1)}<br />
                      <strong>Latest Price:</strong> ₹{prediction.historical[prediction.historical.length - 1].price.toFixed(2)} per quintal<br />
                      <strong>Forecasted Price ({prediction.forecast[prediction.forecast.length - 1].year}):</strong> 
                      ₹{prediction.forecast[prediction.forecast.length - 1].price.toFixed(2)} per quintal
                    </Alert>
                  </div>
                  
                  <div style={{ height: '350px' }}>
                    <Line data={chartData} options={chartOptions} />
                  </div>
                  
                  <div className="mt-4">
                    <h5>Price Trend Analysis</h5>
                    {trend && (
                      <p>
                        The price of {prediction.crop} in {prediction.state} is projected to 
                        <strong className={trend.isIncrease ? 'text-success' : 'text-danger'}>
                          {' '}{trend.isIncrease ? 'increase' : 'decrease'} by ₹{trend.change.toFixed(2)}{' '}
                        </strong> 
                        ({trend.percentage.toFixed(2)}%) over the next {forecastYears} years.
                        {trend.isIncrease ? (
                          <span> This could be favorable for farmers planning to invest in {prediction.crop} cultivation.</span>
                        ) : (
                          <span> Farmers may want to consider diversification or value-addition strategies.</span>
                        )}
                      </p>
                    )}
                    
                    <div className="mt-3">
                      <h6>Factors Affecting Prices:</h6>
                      <ul className="small">
                        <li>Production levels and yield rates</li>
                        <li>Seasonal demand variations</li>
                        <li>Input costs (fertilizers, pesticides, labor)</li>
                        <li>Weather conditions and climate patterns</li>
                        <li>Government policies and market interventions</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
              
              {!loading && !error && !prediction && (
                <div className="text-center my-5">
                  <p>Enter parameters and click "Predict Prices" to see price forecast.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PricePrediction; 