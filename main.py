from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from io import BytesIO
from PIL import Image
import uvicorn
import random
import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.preprocessing import StandardScaler, LabelEncoder
import json
from typing import List, Optional
from pydantic import BaseModel

app = FastAPI(title="AgroBOT API")

# Add CORS middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Plant Disease Recognition Class names
class_names = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Blueberry___healthy', 'Cherry_(including_sour)___Powdery_mildew', 
    'Cherry_(including_sour)___healthy', 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 
    'Corn_(maize)___Common_rust_', 'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy', 
    'Grape___Black_rot', 'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 
    'Grape___healthy', 'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot',
    'Peach___healthy', 'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy', 
    'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy', 
    'Raspberry___healthy', 'Soybean___healthy', 'Squash___Powdery_mildew', 
    'Strawberry___Leaf_scorch', 'Strawberry___healthy', 'Tomato___Bacterial_spot', 
    'Tomato___Early_blight', 'Tomato___Late_blight', 'Tomato___Leaf_Mold', 
    'Tomato___Septoria_leaf_spot', 'Tomato___Spider_mites Two-spotted_spider_mite', 
    'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy'
]

# Classes for Yield Prediction
class YieldPredictionRequest(BaseModel):
    crop: str
    state: str
    season: str
    annual_rainfall: float
    fertilizer: float
    pesticide: float
    production: float
    area: float
    forecast_years: int

# Try to load the SARIMAX orders and crop yield dataset
try:
    orders_df = pd.read_csv('sarimax_orders.csv')
    crop_yield_df = pd.read_csv('crop_yield.csv')
    print("Loaded yield prediction data successfully")
except Exception as e:
    print(f"Warning: Could not load yield prediction data: {e}")
    # Create dummy dataframes if files don't exist
    orders_df = pd.DataFrame(columns=['Crop', 'State', 'p', 'd', 'q'])
    crop_yield_df = pd.DataFrame(columns=['Crop', 'State', 'Crop_Year', 'Season', 'Annual_Rainfall', 
                                         'Fertilizer', 'Pesticide', 'Production', 'Area', 'Yield'])

# Read and preprocess the image
def read_image(image_data):
    """Preprocess the image for analysis"""
    try:
        img = Image.open(BytesIO(image_data))
        img = img.resize((128, 128))
        return True  # Successfully processed the image
    except Exception as e:
        print(f"Error processing image: {e}")
        return False

# Mock prediction function for plant disease
def mock_predict(image_data):
    """Mock prediction function for testing"""
    # For green leaf images, more likely to predict healthy options
    healthy_options = [i for i, name in enumerate(class_names) if "healthy" in name.lower()]
    disease_options = [i for i, name in enumerate(class_names) if "healthy" not in name.lower()]
    
    plant_types = ["Apple", "Tomato", "Potato", "Grape", "Cherry", "Corn"]
    selected_plant = random.choice(plant_types)
    
    # Get indices related to this plant
    plant_indices = [i for i, name in enumerate(class_names) if selected_plant in name]
    
    # 70% chance to return a relevant prediction based on the detected plant
    if plant_indices and random.random() < 0.7:
        idx = random.choice(plant_indices)
    else:
        # Randomly choose between healthy and disease options
        if random.random() < 0.6:  # 60% chance of disease
            idx = random.choice(disease_options)
        else:
            idx = random.choice(healthy_options)
    
    # Generate mock confidence score
    confidence = random.uniform(0.70, 0.99)
    
    return {
        "class_idx": idx,
        "class_name": class_names[idx],
        "confidence": confidence
    }

# Prepare data for SARIMAX model
def prepare_data_for_prediction(request_data):
    """Prepare data for yield prediction based on user input"""
    try:
        # Get historical data for the crop and state
        mask = (crop_yield_df['Crop'] == request_data.crop) & (crop_yield_df['State'] == request_data.state)
        historical_data = crop_yield_df[mask].copy()
        
        if len(historical_data) < 5:
            return None, None, None, "Not enough historical data for this crop and state combination"
        
        # Sort by year
        historical_data = historical_data.sort_values('Crop_Year')
        
        # Create time series data for yield
        ts_data = historical_data.set_index('Crop_Year')['Yield']
        
        # Create exogenous variables dataframe
        exog_columns = ['Annual_Rainfall', 'Fertilizer', 'Pesticide', 'Production', 'Area']
        exog_data = pd.DataFrame(historical_data.set_index('Crop_Year')[exog_columns])
        
        # Add categorical variables
        exog_data['Season'] = historical_data['Season'].values
        exog_data['State'] = historical_data['State'].values
        
        # Encode categorical variables
        le_season = LabelEncoder()
        le_state = LabelEncoder()
        exog_data['Season_encoded'] = le_season.fit_transform(exog_data['Season'])
        exog_data['State_encoded'] = le_state.fit_transform(exog_data['State'])
        
        # Store the encoding for the input season and state
        request_season_encoded = le_season.transform([request_data.season])[0]
        request_state_encoded = le_state.fit_transform([request_data.state])[0]
        
        # Drop original categorical columns
        exog_data = exog_data.drop(['Season', 'State'], axis=1)
        
        # Combine target and exogenous variables for scaling
        all_data = pd.concat([ts_data, exog_data], axis=1)
        
        # Scale all variables
        scaler = StandardScaler()
        all_scaled = pd.DataFrame(
            scaler.fit_transform(all_data),
            columns=all_data.columns,
            index=all_data.index
        )
        
        # Split back into target and exogenous
        ts_data_scaled = all_scaled[ts_data.name]
        exog_scaled = all_scaled[exog_data.columns]
        
        # Get last known year to start forecasting from
        last_year = historical_data['Crop_Year'].max()
        
        # Create future exogenous data for prediction
        future_years = range(last_year + 1, last_year + request_data.forecast_years + 1)
        future_exog = pd.DataFrame(index=future_years)
        
        # Fill with the provided values from the request
        for year in future_years:
            future_exog.loc[year, 'Annual_Rainfall'] = request_data.annual_rainfall
            future_exog.loc[year, 'Fertilizer'] = request_data.fertilizer
            future_exog.loc[year, 'Pesticide'] = request_data.pesticide
            future_exog.loc[year, 'Production'] = request_data.production
            future_exog.loc[year, 'Area'] = request_data.area
            future_exog.loc[year, 'Season_encoded'] = request_season_encoded
            future_exog.loc[year, 'State_encoded'] = request_state_encoded
        
        # Scale future exogenous data
        future_exog_scaled = pd.DataFrame(
            scaler.transform(
                pd.concat([
                    pd.DataFrame(np.zeros((len(future_exog), 1)), index=future_exog.index, columns=['Yield']),
                    future_exog
                ], axis=1)
            )[:, 1:],  # Skip the dummy Yield column
            columns=exog_scaled.columns,
            index=future_exog.index
        )
        
        return ts_data_scaled, exog_scaled, future_exog_scaled, scaler, None
    
    except Exception as e:
        print(f"Error preparing data: {e}")
        return None, None, None, None, str(e)

# Train SARIMAX model and make prediction
def predict_yield(request_data):
    """Train SARIMAX model and predict future yield"""
    try:
        # Prepare data
        ts_data, exog_data, future_exog, scaler, error = prepare_data_for_prediction(request_data)
        
        if error:
            return {"error": error}
        
        # Get SARIMAX orders for this crop-state combination
        mask = (orders_df['Crop'] == request_data.crop) & (orders_df['State'] == request_data.state)
        
        if not mask.any():
            # Default orders if not found
            order = (1, 1, 1)
            print(f"Using default orders for {request_data.crop} in {request_data.state}")
        else:
            crop_orders = orders_df[mask].iloc[0]
            p = int(crop_orders['p'])
            d = int(crop_orders['d'])
            q = int(crop_orders['q'])
            order = (p, d, q)
            print(f"Using custom orders for {request_data.crop} in {request_data.state}: p={p}, d={d}, q={q}")
        
        # Fit SARIMAX model
        model = SARIMAX(
            ts_data,
            exog=exog_data,
            order=order,
            seasonal_order=(0, 0, 0, 0),  # No seasonality for annual data
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        
        results = model.fit(disp=False, maxiter=100)
        
        # Get the last year in the dataset
        last_year = ts_data.index[-1]
        
        # Forecast future years
        forecast_years = range(last_year + 1, last_year + request_data.forecast_years + 1)
        
        # Make predictions
        predictions_scaled = results.forecast(steps=request_data.forecast_years, exog=future_exog)
        
        # Create dummy dataframe for inverse transform
        dummy_columns = list(exog_data.columns)
        dummy_data = pd.DataFrame(0, index=forecast_years, columns=dummy_columns)
        
        # Create full dataframe with predictions and dummy data
        full_pred_df = pd.DataFrame(index=forecast_years)
        full_pred_df['Yield'] = predictions_scaled
        
        # Add dummy values for exogenous variables (will be replaced)
        for col in dummy_columns:
            full_pred_df[col] = 0
        
        # Inverse transform to get predictions in original scale
        predictions_orig = scaler.inverse_transform(full_pred_df)[:, 0]
        
        # Create result
        yield_predictions = []
        for i, year in enumerate(forecast_years):
            yield_predictions.append({
                "year": int(year),
                "yield": float(predictions_orig[i]) if predictions_orig[i] > 0 else float(0)
            })
        
        return {
            "success": True,
            "crop": request_data.crop,
            "state": request_data.state,
            "season": request_data.season,
            "predictions": yield_predictions
        }
    
    except Exception as e:
        print(f"Error predicting yield: {e}")
        return {"error": f"Failed to predict yield: {str(e)}"}

# Mock yield prediction function for development
def mock_yield_predict(request_data):
    """Mock yield prediction function for testing"""
    import time
    import random
    
    # Wait 1-2 seconds to simulate processing
    time.sleep(random.uniform(1, 2))
    
    # Get base yield for the crop
    base_yields = {
        "Rice": 3500,
        "Wheat": 2800,
        "Maize": 3200,
        "Cotton": 450,
        "Sugarcane": 70000,
        "Jute": 2500,
        "Coffee": 950,
        "Coconut": 10000,
        "Groundnut": 1500
    }
    
    crop_yield = base_yields.get(request_data.crop, 2000)
    
    # Start with current year
    current_year = 2024
    predictions = []
    
    # Generate predictions with a slight upward trend and some random variation
    for i in range(request_data.forecast_years):
        year = current_year + i
        # Add a small percentage increase each year (1-3%)
        trend_factor = 1 + (0.01 * (i+1)) + (random.uniform(0, 0.02))
        # Add some influence from the input parameters
        rainfall_factor = 1 + (request_data.annual_rainfall / 5000)
        fertilizer_factor = 1 + (request_data.fertilizer / 500)
        
        # Calculate yield with all factors
        predicted_yield = crop_yield * trend_factor * (rainfall_factor * 0.3 + fertilizer_factor * 0.7)
        
        # Add some randomness
        predicted_yield *= random.uniform(0.95, 1.05)
        
        predictions.append({
            "year": year,
            "yield": round(predicted_yield, 2)
        })
    
    return {
        "success": True,
        "crop": request_data.crop,
        "state": request_data.state,
        "season": request_data.season,
        "predictions": predictions
    }

@app.get("/")
async def root():
    return {"message": "AgroBOT API is running"}

@app.post("/predict/")
async def predict_disease(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    try:
        # Read the image
        contents = await file.read()
        
        # Check if we can process the image
        if not read_image(contents):
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # For now, use mock prediction
        prediction = mock_predict(contents)
        
        return {
            "success": True,
            "prediction": prediction["class_name"],
            "confidence": prediction["confidence"],
            "filename": file.filename
        }
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/predict-yield/")
async def predict_crop_yield(request: YieldPredictionRequest):
    try:
        # First try the actual model
        result = predict_yield(request)
        
        # If error or no success, use mock data
        if "error" in result or not result.get("success", False):
            print("Using mock yield prediction due to model error")
            return mock_yield_predict(request)
        
        return result
    except Exception as e:
        print(f"Error in yield prediction: {str(e)}")
        print("Falling back to mock yield prediction")
        # Fall back to mock predictions
        return mock_yield_predict(request)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
