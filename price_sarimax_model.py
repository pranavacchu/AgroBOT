import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import os
import warnings
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime
from urllib.parse import urlencode
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
warnings.filterwarnings('ignore')

def load_commodity_data():
    """
    Load commodity codes and names from CSV file
    """
    try:
        commodity_df = pd.read_csv('CommodityAndCommodityHeads.csv')
        return commodity_df
    except Exception as e:
        print(f"Error loading commodity data: {str(e)}")
        return None

def get_commodity_info(crop_name, commodity_df):
    """
    Get commodity code and name for a given crop
    """
    # Try exact match first
    match = commodity_df[commodity_df['CommodityHead'].str.lower() == crop_name.lower()]
    if not match.empty:
        return match.iloc[0]['Commodity'], match.iloc[0]['CommodityHead']
    
    # Try partial match
    for _, row in commodity_df.iterrows():
        if crop_name.lower() in row['CommodityHead'].lower():
            return row['Commodity'], row['CommodityHead']
    
    return None, None

def get_url(commodity_code, commodity_name, year, state):
    """Given a commodity code and name, returns the complete URL to be browsed"""
    base_url = 'https://agmarknet.gov.in/SearchCmmMkt.aspx'
    date_from = f"01-Jan-{year}"
    date_to = f"31-Dec-{year}"
    
    # State code mapping
    state_codes = {
        'Andhra Pradesh': 'AP',
        'Arunachal Pradesh': 'AR',
        'Assam': 'AS',
        'Bihar': 'BI',
        'Chhattisgarh': 'CG',
        'Delhi': 'DL',
        'Goa': 'GA',
        'Gujarat': 'GJ',
        'Haryana': 'HR',
        'Himachal Pradesh': 'HP',
        'Jammu and Kashmir': 'JK',
        'Jharkhand': 'JH',
        'Karnataka': 'KK',
        'Kerala': 'KL',
        'Madhya Pradesh': 'MP',
        'Maharashtra': 'MH',
        'Manipur': 'MN',
        'Meghalaya': 'ML',
        'Mizoram': 'MZ',
        'Nagaland': 'NL',
        'Odisha': 'OR',
        'Puducherry': 'PY',
        'Punjab': 'PB',
        'Rajasthan': 'RJ',
        'Sikkim': 'SK',
        'Tamil Nadu': 'TN',
        'Telangana': 'TG',
        'Tripura': 'TR',
        'Uttar Pradesh': 'UP',
        'Uttarakhand': 'UT',
        'West Bengal': 'WB'
    }
    
    # Get state code, default to '0' if not found
    state_code = state_codes.get(state, '0')
    
    parameters = {
        "Tx_Commodity": commodity_code,
        "Tx_State": state_code,
        "Tx_District": 0,
        "Tx_Market": 0,
        "DateFrom": date_from,
        "DateTo": date_to,
        "Fr_Date": date_from,
        "To_Date": date_to,
        "Tx_Trend": 0,
        "Tx_CommodityHead": commodity_name,
        "Tx_StateHead": state,  # Use full state name
        "Tx_DistrictHead": "--Select--",
        "Tx_MarketHead": "--Select--",
    }
    query = urlencode(parameters)
    return "?".join([base_url, query])

def setup_driver():
    """
    Set up Chrome driver with appropriate options
    """
    try:
        # Set up Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--ignore-certificate-errors')
        chrome_options.add_argument('--ignore-ssl-errors')
        chrome_options.add_argument('--allow-insecure-localhost')
        chrome_options.add_argument('--disable-web-security')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-software-rasterizer')
        chrome_options.add_argument('--disable-notifications')
        chrome_options.add_argument('--disable-popup-blocking')
        chrome_options.add_argument('--start-maximized')
        chrome_options.add_argument('--window-size=1920,1080')
        
        # Add experimental options
        chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # Initialize the Chrome driver with webdriver_manager
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Set page load timeout
        driver.set_page_load_timeout(30)
        driver.set_script_timeout(30)
        
        return driver
    except Exception as e:
        print(f"Error setting up Chrome driver: {str(e)}")
        return None

def get_table_data(driver, state):
    """Extract data from the price table"""
    try:
        # Get page source and create soup
        soup = BeautifulSoup(driver.page_source, "html.parser")
        
        # Find the price table using the specific class and ID
        price_table = soup.find('table', {
            'class': 'tableagmark_new',
            'id': 'cphBody_GridPriceData'
        })
        
        if price_table is None:
            print("Price table not found")
            return []
        
        print("Found price table")
        
        # Get all rows including those in tbody
        all_rows = []
        
        # First try to find tbody
        tbody = price_table.find('tbody')
        if tbody:
            all_rows = tbody.find_all('tr')
        else:
            all_rows = price_table.find_all('tr')
            
        print(f"Found {len(all_rows)} total rows")
        
        if not all_rows:
            print("No rows found in table")
            return []
        
        # Process data rows
        rows = []
        # Skip first row (header)
        for row in all_rows[1:]:
            try:
                # Get all td elements
                cells = row.find_all('td')
                
                # Skip empty rows or rows with insufficient cells
                if not cells or len(cells) < 8:  # We need at least 8 columns
                    continue
                    
                # Extract text from each cell, handling potential None values
                cell_data = []
                for cell in cells:
                    text = cell.get_text(strip=True) if cell else ''
                    cell_data.append(text)
                
                # Skip row if any required cell is empty
                if not all(cell_data[:8]):  # Check first 8 cells
                    continue
                
                # Create row data dictionary with correct column mapping
                row_data = {
                    'State Name': state,  # Use state from URL
                    
                    'Commodity': cell_data[3],
                    'Min Price (Rs/Quintal)': cell_data[6],
                    'Max Price (Rs/Quintal)': cell_data[7],
                    'Modal Price (Rs/Quintal)': cell_data[8],
                    'Price Date': cell_data[9]
                }
                
                # Only append if we have actual data (not just whitespace)
                if any(value.strip() for value in row_data.values()):
                    rows.append(row_data)
                    print(f"Added row: {row_data}")
                
            except Exception as e:
                print(f"Error processing row: {str(e)}")
                continue
        
        if not rows:
            print("No valid data rows found")
            return []
        
        print(f"Successfully extracted {len(rows)} rows of data")
        return rows
            
    except Exception as e:
        print(f"Error extracting table data: {str(e)}")
        print("Page source:")
        print(soup.prettify()[:1000])  # Print first 1000 chars of page source
        return []

def fetch_price_data(crop, state):
    """
    Fetch historical price data from agmarknet website from 1997 to 2020
    """
    try:
        # Load commodity data
        commodity_df = load_commodity_data()
        if commodity_df is None:
            print("Error: Could not load commodity data")
            return None
        
        # Get commodity code and name
        commodity_code, commodity_name = get_commodity_info(crop, commodity_df)
        if commodity_code is None:
            print(f"Could not find commodity code for {crop}")
            return None
        
        print(f"Using commodity code {commodity_code} for {commodity_name}")
        
        # Initialize list to store historical prices
        historical_prices = []
        
        # Set up Chrome driver
        driver = setup_driver()
        if driver is None:
            print("Error: Could not set up Chrome driver")
            return None
        
        try:
            # Fetch data from 1997 to 2020
            print("\nDEBUG: Starting data fetch for years 1997-2020")
            for year in range(1997, 2021):
                print(f"\nFetching data for {year}...")
                
                # Get URL for the year with state parameter
                url = get_url(commodity_code, commodity_name, year, state)
                
                try:
                    # Load the URL
                    driver.get(url)
                    
                    # Wait for table to be present
                    WebDriverWait(driver, 20).until(
                        EC.presence_of_element_located((By.CLASS_NAME, "tableagmark_new"))
                    )
                    
                    # Get table data
                    rows = get_table_data(driver, state)
                    
                    if not rows:
                        print(f"No data found for {year}")
                        continue
                    
                    # Create a DataFrame for this year's data
                    year_df = pd.DataFrame(rows)
                    
                    # Filter for the specific state
                    state_data = year_df[year_df['State Name'].str.lower() == state.lower()]
                    
                    if not state_data.empty:
                        # Convert price columns to numeric, removing commas and handling errors
                        state_data['Min Price'] = pd.to_numeric(
                            state_data['Min Price (Rs/Quintal)'].str.replace(',', ''), 
                            errors='coerce'
                        )
                        state_data['Max Price'] = pd.to_numeric(
                            state_data['Max Price (Rs/Quintal)'].str.replace(',', ''), 
                            errors='coerce'
                        )
                        state_data['Modal Price'] = pd.to_numeric(
                            state_data['Modal Price (Rs/Quintal)'].str.replace(',', ''), 
                            errors='coerce'
                        )
                        
                        # Calculate statistics for the year
                        yearly_stats = {
                            'year': year,
                            'price': state_data['Modal Price'].mean(),
                            'min_price': state_data['Min Price'].mean(),
                            'max_price': state_data['Max Price'].mean(),
                            'modal_price': state_data['Modal Price'].mean(),
                            'num_records': len(state_data)
                        }
                        
                        historical_prices.append(yearly_stats)
                        print(f"Processed {yearly_stats['num_records']} records for {commodity_name} in {state} for {year}")
                        print(f"Average Modal Price: {yearly_stats['modal_price']:.2f}")
                        print(f"Average Min Price: {yearly_stats['min_price']:.2f}")
                        print(f"Average Max Price: {yearly_stats['max_price']:.2f}")
                    else:
                        print(f"No data found for {state} in {year}")
                    
                except Exception as e:
                    print(f"Error loading page for {year}: {str(e)}")
                    continue
                
                # Add delay between years
                time.sleep(5)
        
        finally:
            # Close the driver
            driver.quit()
        
        if not historical_prices:
            print(f"No valid price data found for {commodity_name} in {state}")
            return None
        
        # Convert to DataFrame
        prices_df = pd.DataFrame(historical_prices)
        
        # Sort by year
        prices_df = prices_df.sort_values('year')
        
        # Print summary of collected data
        print("\nSummary of collected price data:")
        print(f"Years with data: {len(prices_df)}")
        print(f"Average number of records per year: {prices_df['num_records'].mean():.1f}")
        print("\nPrice Statistics:")
        print(prices_df[['year', 'min_price', 'modal_price', 'max_price', 'num_records']].to_string(index=False))
        
        return prices_df
        
    except Exception as e:
        print(f"Error fetching price data for {crop} in {state}: {str(e)}")
        if 'driver' in locals():
            driver.quit()
        return None

def load_data():
    """
    Load and prepare the dataset
    """
    try:
        # Read the data
        df = pd.read_csv('crop_yield_price.csv')
        
        # Convert Crop_Year to datetime, handling different date formats
        try:
            # First try direct year format
            df['Crop_Year'] = pd.to_datetime(df['Crop_Year'], format='%Y')
        except ValueError:
            try:
                # Try DD-MM-YYYY format
                df['Crop_Year'] = pd.to_datetime(df['Crop_Year'], format='%d-%m-%Y')
                # Extract just the year and convert back to datetime
                df['Crop_Year'] = pd.to_datetime(df['Crop_Year'].dt.year, format='%Y')
            except ValueError:
                # If that fails, try parsing without format specification
                df['Crop_Year'] = pd.to_datetime(df['Crop_Year'])
                df['Crop_Year'] = pd.to_datetime(df['Crop_Year'].dt.year, format='%Y')
        
        # Sort by year
        df = df.sort_values('Crop_Year')
        
        # Check if Price column exists
        if 'Price' not in df.columns:
            df['Price'] = None
        
        return df
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        print("Please ensure Crop_Year column contains valid dates or years")
        return None

def load_orders():
    """
    Load custom orders from CSV file
    """
    try:
        orders_df = pd.read_csv('sarimax_orders.csv')
        return orders_df
    except Exception as e:
        print(f"Error loading orders: {str(e)}")
        return None

def prepare_data(df, crop, state):
    """
    Prepare time series data for a specific crop and state
    """
    try:
        print("\nDEBUG: Starting data preparation...")
        print(f"DEBUG: Total records in dataset: {len(df)}")
        print(f"DEBUG: Looking for crop='{crop}' and state='{state}'")
        
        # Define numeric columns
        numeric_columns = ['Annual_Rainfall', 'Fertilizer', 'Pesticide', 'Production', 'Area', 'Yield']
        print(f"DEBUG: Using numeric columns: {numeric_columns}")
        
        # Filter data for specific crop and state
        mask = (df['Crop'] == crop) & (df['State'] == state)
        data = df[mask].copy()
        
        print(f"DEBUG: Found {len(data)} records for {crop} in {state}")
        
        if data.empty:
            print(f"No data found for {crop} in {state}")
            return None, None, None, None, None, None, None
        
        # Sort by year
        data = data.sort_values('Crop_Year')
        print("\nDEBUG: Year range in filtered data:")
        print(f"DEBUG: First year: {data['Crop_Year'].min()}")
        print(f"DEBUG: Last year: {data['Crop_Year'].max()}")
        
        # Check if we have complete price data
        missing_prices = data['Price'].isna().any()
        total_prices = len(data)
        missing_count = data['Price'].isna().sum()
        print(f"\nDEBUG: Price data status:")
        print(f"DEBUG: Total records: {total_prices}")
        print(f"DEBUG: Missing prices: {missing_count}")
        print(f"DEBUG: Complete prices: {total_prices - missing_count}")
        print(f"DEBUG: Need to fetch new data: {missing_prices}")
        
        if missing_prices:
            # Get list of years with missing prices
            missing_years = data[data['Price'].isna()]['Crop_Year'].dt.year.unique()
            print(f"\nDEBUG: Years with missing prices: {missing_years}")
            
            print(f"Fetching price data for {crop} in {state} for {len(missing_years)} missing years...")
            prices_df = fetch_price_data(crop, state)
            
            if prices_df is None:
                print(f"No price data found on website for {crop} in {state}. Setting missing prices to 0.")
                # Set missing prices to 0
                mask = (df['Crop'] == crop) & (df['State'] == state) & df['Price'].isna()
                df.loc[mask, 'Price'] = 0
            else:
                # Update only the missing years in the main dataframe
                for year in missing_years:
                    year_data = prices_df[prices_df['year'] == year]
                    if not year_data.empty:
                        mask = (df['Crop'] == crop) & (df['State'] == state) & (df['Crop_Year'].dt.year == year)
                        df.loc[mask, 'Price'] = year_data['modal_price'].iloc[0]
                        print(f"Updated price for year {year}")
                    else:
                        print(f"No price data found for year {year}, setting to 0")
                        mask = (df['Crop'] == crop) & (df['State'] == state) & (df['Crop_Year'].dt.year == year)
                        df.loc[mask, 'Price'] = 0
                
                try:
                    # Try to save updated dataframe back to CSV
                    df.to_csv('crop_yield_price.csv', index=False)
                    print("Updated prices saved to crop_yield_price.csv")
                except Exception as e:
                    print(f"Warning: Could not save updated prices to CSV: {str(e)}")
                    print("Continuing with model building using current data...")
        else:
            print(f"Using existing price data from crop_yield_price.csv for {crop} in {state}")
        
        # Drop rows with missing values
        data = data.dropna()
        
        if len(data) < 5:  # Check if we have enough data after dropping missing values
            print(f"Not enough data after removing missing values for {crop} in {state}")
            return None, None, None, None, None, None, None
        
        # Create time series data for price (target variable)
        ts_data = data.set_index('Crop_Year')['Price']
        
        # Create time series data for exogenous variables
        exog_data = pd.DataFrame(data.set_index('Crop_Year')[numeric_columns])
        
        # Add categorical variables using one-hot encoding if they exist
        categorical_columns = []
        if 'Season' in data.columns:
            print("\nDEBUG: One-hot encoding Season variable")
            season_dummies = pd.get_dummies(data['Season'], prefix='Season')
            categorical_columns.extend(season_dummies.columns)
            # Add the dummy variables to exog_data
            for col in season_dummies.columns:
                exog_data[col] = season_dummies[col].values
        
        if 'State' in data.columns:
            print("DEBUG: One-hot encoding State variable")
            state_dummies = pd.get_dummies(data['State'], prefix='State')
            categorical_columns.extend(state_dummies.columns)
            # Add the dummy variables to exog_data
            for col in state_dummies.columns:
                exog_data[col] = state_dummies[col].values
        
        print(f"DEBUG: Added {len(categorical_columns)} one-hot encoded columns")
        print("DEBUG: Categorical columns:", categorical_columns)
        
        # Ensure both ts_data and exog_data have the same index
        common_index = ts_data.index.intersection(exog_data.index)
        ts_data = ts_data[common_index]
        exog_data = exog_data.loc[common_index]
        
        if len(ts_data) < 5:  # Final check after alignment
            print(f"Not enough data after alignment for {crop} in {state}")
            return None, None, None, None, None, None, None
        
        # Scale only the numerical columns in exog_data
        scaler = StandardScaler()
        
        # Separate numerical and categorical columns in exog_data
        numerical_exog = exog_data[numeric_columns].copy()
        categorical_exog = exog_data.drop(columns=numeric_columns)
        
        # Scale numerical features
        scaled_numerical = pd.DataFrame(
            scaler.fit_transform(numerical_exog),
            columns=numerical_exog.columns,
            index=numerical_exog.index
        )
        
        # Scale the target variable (price) separately
        price_scaler = StandardScaler()
        ts_data_scaled = pd.Series(
            price_scaler.fit_transform(ts_data.values.reshape(-1, 1)).flatten(),
            index=ts_data.index,
            name=ts_data.name
        )
        
        # Combine scaled numerical and unscaled categorical features
        exog_scaled = pd.concat([scaled_numerical, categorical_exog], axis=1)
        
        # Store the combined scaler information
        combined_scaler = (price_scaler, scaler)
        
        return ts_data_scaled, exog_scaled, None, None, combined_scaler, ts_data, numeric_columns
        
    except Exception as e:
        print(f"Error in prepare_data for {crop} in {state}: {str(e)}")
        return None, None, None, None, None, None, None

def train_sarimax_model(data, exog_data, original_price, crop, state, orders_df, scaler, numeric_columns):
    """
    Train SARIMAX model with custom orders from CSV using data from 2005-2015
    and predict for 2015-2020
    """
    try:
        # Unpack the combined scaler
        price_scaler, feature_scaler = scaler
        
        # Get custom orders for the crop-state combination
        mask = (orders_df['Crop'] == crop) & (orders_df['State'] == state)
        crop_orders = orders_df[mask]
        
        # Use default orders if no custom orders found
        if crop_orders.empty:
            print(f"No custom orders found for {crop} in {state}, using default orders")
            p, d, q = 1, 1, 1  # Default SARIMA(1,1,1) model
        else:
            # Limit orders to prevent overfitting
            p = min(int(crop_orders.iloc[0]['p']), 2)  # Limit AR terms
            d = min(int(crop_orders.iloc[0]['d']), 2)  # Limit differencing
            q = min(int(crop_orders.iloc[0]['q']), 2)  # Limit MA terms
        
        order = (p, d, q)
        
        print(f"\nUsing orders for {crop} in {state}:")
        print(f"p={order[0]}, d={order[1]}, q={order[2]}")
        
        # Sort data by year and ensure numeric type
        data = pd.to_numeric(data, errors='coerce')
        data = data.sort_index()
        exog_data = exog_data.astype(float)
        exog_data = exog_data.sort_index()
        original_price = pd.to_numeric(original_price, errors='coerce')
        original_price = original_price.sort_index()
        
        print("\nDEBUG: Data types after conversion:")
        print(f"Target data type: {data.dtype}")
        print(f"Exogenous data types: {exog_data.dtypes}")
        print(f"Original price type: {original_price.dtype}")
        
        # Check for NaN values before splitting
        print("\nDEBUG: NaN check before cleaning:")
        print(f"Target data NaN count: {data.isna().sum()}")
        print("Exogenous data NaN counts:")
        print(exog_data.isna().sum())
        
        # Handle NaN values
        # For target variable, forward fill then backward fill
        data = data.fillna(method='ffill').fillna(method='bfill')
        
        # For exogenous variables, fill NaN with column means
        for col in exog_data.columns:
            if exog_data[col].isna().any():
                col_mean = exog_data[col].mean()
                exog_data[col] = exog_data[col].fillna(col_mean)
                print(f"Filled NaN in {col} with mean: {col_mean:.2f}")
        
        print("\nDEBUG: NaN check after cleaning:")
        print(f"Target data NaN count: {data.isna().sum()}")
        print("Exogenous data NaN counts:")
        print(exog_data.isna().sum())
        
        # Split data into training (2005-2015) and testing (2015-2020) periods
        train_mask = (data.index.year >= 2005) & (data.index.year <= 2015)
        test_mask = (data.index.year >= 2015) & (data.index.year <= 2020)
        
        train_data = data[train_mask]
        test_data = data[test_mask]
        train_exog = exog_data[train_mask]
        test_exog = exog_data[test_mask]
        train_original = original_price[train_mask]
        test_original = original_price[test_mask]
        
        print(f"\nTraining period: {train_data.index[0].year} to {train_data.index[-1].year}")
        print(f"Testing period: {test_data.index[0].year} to {test_data.index[-1].year}")
        
        print("\nDEBUG: Data shapes:")
        print(f"Training data shape: {train_data.shape}")
        print(f"Training exog shape: {train_exog.shape}")
        print(f"Test data shape: {test_data.shape}")
        print(f"Test exog shape: {test_exog.shape}")
        
        # Additional check for NaN after splitting
        if train_data.isna().any() or test_data.isna().any():
            print("ERROR: NaN values still present in target data after cleaning")
            return None, None, None, None, None
        
        if train_exog.isna().any().any() or test_exog.isna().any().any():
            print("ERROR: NaN values still present in exogenous data after cleaning")
            return None, None, None, None, None
        
        # Check if we have enough data for training and testing
        if len(train_data) < 5:
            print(f"Insufficient data for training period (2005-2015) for {crop} in {state}")
            return None, None, None, None, None
        
        if len(test_data) < 1:
            print(f"Insufficient data for testing period (2015-2020) for {crop} in {state}")
            return None, None, None, None, None
        
        # Check for any remaining non-numeric values
        if not np.issubdtype(train_data.dtype, np.number):
            print("ERROR: Training data contains non-numeric values")
            return None, None, None, None, None
        
        if not np.all([np.issubdtype(dtype, np.number) for dtype in train_exog.dtypes]):
            print("ERROR: Exogenous data contains non-numeric values")
            return None, None, None, None, None
        
        # Final data validation before model fitting
        print("\nDEBUG: Final data validation:")
        print("Training data:")
        print(train_data.describe())
        print("\nTraining exog data:")
        print(train_exog.describe())
        
        # Convert data to numpy arrays and check for any remaining issues
        train_data_np = np.asarray(train_data, dtype=float)
        train_exog_np = np.asarray(train_exog, dtype=float)
        
        if np.any(np.isnan(train_data_np)) or np.any(np.isinf(train_data_np)):
            print("ERROR: Training data contains NaN or inf values after conversion")
            return None, None, None, None, None
            
        if np.any(np.isnan(train_exog_np)) or np.any(np.isinf(train_exog_np)):
            print("ERROR: Training exog data contains NaN or inf values after conversion")
            return None, None, None, None, None
        
        # Fit SARIMAX model
        try:
            model = SARIMAX(train_data_np,
                          exog=train_exog_np,
                          order=order,
                          seasonal_order=(0,0,0,0),  # No seasonality for annual data
                          enforce_stationarity=False,
                          enforce_invertibility=False)
            
            results = model.fit(disp=False, maxiter=100)  # Limit iterations
        except Exception as e:
            print(f"ERROR: Failed to fit SARIMAX model: {str(e)}")
            return None, None, None, None, None
        
        # Make predictions with exogenous variables
        predictions_scaled = results.forecast(steps=len(test_data), exog=test_exog)
        
        # Inverse transform predictions using price scaler
        predictions = price_scaler.inverse_transform(predictions_scaled.reshape(-1, 1)).flatten()
        
        # Calculate metrics using original (unscaled) data
        mse = mean_squared_error(test_original, predictions)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(test_original, predictions)
        
        # Calculate R² using original (unscaled) data
        y_true = test_original
        y_pred = predictions
        y_mean = np.mean(y_true)
        
        # Total sum of squares
        ss_tot = np.sum((y_true - y_mean) ** 2)
        
        # Residual sum of squares
        ss_res = np.sum((y_true - y_pred) ** 2)
        
        # R² calculation
        r2 = 1 - (ss_res / ss_tot)
        
        # Print debugging information
        print(f"\nDebugging R² calculation for {crop} in {state}:")
        print(f"Mean of actual values: {y_mean:.4f}")
        print(f"Total sum of squares: {ss_tot:.4f}")
        print(f"Residual sum of squares: {ss_res:.4f}")
        print(f"Calculated R²: {r2:.4f}")
        
        return results, predictions, test_original, train_original, {'mse': mse, 'rmse': rmse, 'mae': mae, 'r2': r2}
    
    except Exception as e:
        print(f"Error training model for {crop} in {state}: {str(e)}")
        return None, None, None, None, None

def plot_results(train_data, test_data, predictions, crop, state, save_dir='price_plots'):
    """
    Plot actual vs predicted values with enhanced visualization
    """
    # Create figure with two subplots
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10), height_ratios=[2, 1])
    
    # Plot 1: Time Series with Predictions
    ax1.plot(train_data.index, train_data.values, 
             label='Historical Data', 
             color='blue', 
             linewidth=2, 
             marker='o')
    
    ax1.plot(test_data.index, test_data.values, 
             label='Actual Test Data', 
             color='green', 
             linewidth=2, 
             marker='o')
    
    ax1.plot(test_data.index, predictions, 
             label='Model Predictions', 
             color='red', 
             linewidth=2, 
             linestyle='--', 
             marker='s')
    
    # Customize the first plot
    ax1.set_title(f'Crop Price Prediction for {crop} in {state}', 
                  fontsize=14, 
                  pad=20)
    ax1.set_xlabel('Year', fontsize=12)
    ax1.set_ylabel('Price (Rs/quintal)', fontsize=12)
    ax1.legend(loc='best', fontsize=10)
    ax1.grid(True, linestyle='--', alpha=0.7)
    
    # Rotate x-axis labels for better readability
    ax1.tick_params(axis='x', rotation=45)
    
    # Plot 2: Residuals
    residuals = test_data.values - predictions
    ax2.plot(test_data.index, residuals, 
             color='purple', 
             linewidth=2, 
             marker='o')
    
    # Add horizontal line at y=0
    ax2.axhline(y=0, color='r', linestyle='--', alpha=0.5)
    
    # Customize the second plot
    ax2.set_title('Prediction Residuals', fontsize=12, pad=20)
    ax2.set_xlabel('Year', fontsize=12)
    ax2.set_ylabel('Residuals', fontsize=12)
    ax2.grid(True, linestyle='--', alpha=0.7)
    
    # Rotate x-axis labels for better readability
    ax2.tick_params(axis='x', rotation=45)
    
    # Add RMSE and R² information
    rmse = np.sqrt(np.mean(residuals**2))
    r2 = 1 - np.sum(residuals**2) / np.sum((test_data.values - np.mean(test_data.values))**2)
    
    info_text = f'RMSE: {rmse:.2f}\nR²: {r2:.2f}'
    ax1.text(0.02, 0.98, info_text,
             transform=ax1.transAxes,
             verticalalignment='top',
             bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    # Adjust layout to prevent overlap
    plt.tight_layout()
    
    # Create directory if it doesn't exist
    os.makedirs(save_dir, exist_ok=True)
    
    # Sanitize crop and state names for filename
    safe_crop = crop.replace('/', '_').replace('\\', '_').replace(' ', '_')
    safe_state = state.replace('/', '_').replace('\\', '_').replace(' ', '_')
    
    # Save plot with high DPI
    plt.savefig(os.path.join(save_dir, f'{safe_crop}_{safe_state}_price_prediction.png'),
                dpi=300,
                bbox_inches='tight')
    plt.close()

def get_available_states(df):
    """Get list of available states from the dataset"""
    return sorted(df['State'].unique().tolist())

def get_available_crops(df, state):
    """Get list of available crops for a specific state"""
    return sorted(df[df['State'] == state]['Crop'].unique().tolist())

def display_menu(options, title):
    """Display a numbered menu of options and get user selection"""
    print(f"\n{title}")
    print("-" * 50)
    for idx, option in enumerate(options, 1):
        print(f"{idx}. {option}")
    print("-" * 50)
    
    while True:
        try:
            choice = int(input("\nEnter your choice (number): "))
            if 1 <= choice <= len(options):
                return options[choice - 1]
            else:
                print("Invalid choice. Please try again.")
        except ValueError:
            print("Please enter a valid number.")

def insert_price_data(df, selected_crop, selected_state):
    """
    Insert price data for a specific crop and state combination
    """
    try:
        # Filter data for specific crop and state
        mask = (df['Crop'] == selected_crop) & (df['State'] == selected_state)
        data = df[mask].copy()
        
        if data.empty:
            print(f"No data found for {selected_crop} in {selected_state}")
            return None
        
        # Sort by year
        data = data.sort_values('Crop_Year')
        print("\nYear range in filtered data:")
        print(f"First year: {data['Crop_Year'].min().year}")
        print(f"Last year: {data['Crop_Year'].max().year}")
        
        # Get list of years
        years = data['Crop_Year'].dt.year.unique()
        print("\nAvailable years:")
        for i, year in enumerate(years, 1):
            current_price = df.loc[
                (df['Crop'] == selected_crop) & 
                (df['State'] == selected_state) & 
                (df['Crop_Year'].dt.year == year),
                'Price'
            ].iloc[0]
            print(f"{i}. {year} - Current Price: {current_price}")
        
        while True:
            try:
                year_idx = int(input("\nEnter the number of the year to update (0 to finish): "))
                if year_idx == 0:
                    break
                if 1 <= year_idx <= len(years):
                    selected_year = years[year_idx - 1]
                    new_price = float(input(f"Enter new price for {selected_year}: "))
                    
                    # Update price in the dataframe
                    mask = (
                        (df['Crop'] == selected_crop) & 
                        (df['State'] == selected_state) & 
                        (df['Crop_Year'].dt.year == selected_year)
                    )
                    df.loc[mask, 'Price'] = new_price
                    print(f"Updated price for {selected_year}")
                else:
                    print("Invalid year number")
            except ValueError:
                print("Please enter valid numbers")
        
        # Save updated dataframe
        try:
            df.to_csv('crop_yield_price.csv', index=False)
            print("\nUpdated prices saved to crop_yield_price.csv")
        except Exception as e:
            print(f"Warning: Could not save updated prices to CSV: {str(e)}")
        
        return df
        
    except Exception as e:
        print(f"Error inserting price data: {str(e)}")
        return None

def main():
    # Load data and orders
    print("Loading data and orders...")
    df = load_data()
    orders_df = load_orders()
    
    if df is None:
        print("Error: Could not load data file")
        return
    
    if orders_df is None:
        print("Error: Could not load orders file")
        return
    
    while True:
        print("\nOptions:")
        print("1. Insert price data")
        print("2. Run SARIMAX model")
        print("3. Exit")
        
        try:
            choice = int(input("\nEnter your choice (1-3): "))
            
            if choice == 3:
                print("Exiting program...")
                break
            
            # Get available states
            available_states = get_available_states(df)
            if not available_states:
                print("No states found in the dataset")
                continue
            
            # Let user select state
            selected_state = display_menu(available_states, "Available States")
            print(f"\nSelected State: {selected_state}")
            
            # Get available crops for selected state
            available_crops = get_available_crops(df, selected_state)
            if not available_crops:
                print(f"No crops found for {selected_state}")
                continue
            
            # Let user select crop
            selected_crop = display_menu(available_crops, f"Available Crops in {selected_state}")
            print(f"\nSelected Crop: {selected_crop}")
            
            if choice == 1:
                # Insert price data
                df = insert_price_data(df, selected_crop, selected_state)
                if df is None:
                    print("Failed to update price data")
                    continue
                
            elif choice == 2:
                # Check if price data exists
                mask = (df['Crop'] == selected_crop) & (df['State'] == selected_state)
                if df[mask]['Price'].isna().all():
                    print(f"\nNo price data found for {selected_crop} in {selected_state}")
                    print("Please insert price data first")
                    continue
                
                print(f"\nProcessing {selected_crop} in {selected_state}")
                
                # Prepare data
                data_prepared = prepare_data(df, selected_crop, selected_state)
                if data_prepared is None:
                    print(f"Could not prepare data for {selected_crop} in {selected_state}")
                    continue
                
                ts_data, exog_data, le_season, le_state, scaler, original_price, numeric_columns = data_prepared
                
                # Train model and get predictions
                results, predictions, test_data, train_data, metrics = train_sarimax_model(
                    ts_data, 
                    exog_data,
                    original_price,
                    selected_crop,
                    selected_state,
                    orders_df,
                    scaler,
                    numeric_columns
                )
                
                if results is not None and predictions is not None:
                    # Plot results
                    plot_results(train_data, test_data, predictions, selected_crop, selected_state)
                    
                    # Print results
                    print(f"\nModel Performance for {selected_crop} in {selected_state}:")
                    print(f"RMSE: {metrics['rmse']:.2f}")
                    print(f"MAE: {metrics['mae']:.2f}")
                    print(f"R2: {metrics['r2']:.2f}")
                    
                    # Save results to CSV
                    results_df = pd.DataFrame([{
                        'Crop': selected_crop,
                        'State': selected_state,
                        'MSE': metrics['mse'],
                        'RMSE': metrics['rmse'],
                        'MAE': metrics['mae'],
                        'R2': metrics['r2']
                    }])
                    
                    # Append to existing results file if it exists
                    if os.path.exists('price_model_results.csv'):
                        results_df.to_csv('price_model_results.csv', mode='a', header=False, index=False)
                    else:
                        results_df.to_csv('price_model_results.csv', index=False)
                    
                    print("\nResults have been saved to 'price_model_results.csv'")
                    print("Plots have been saved to the 'price_plots' directory")
                else:
                    print(f"\nCould not generate predictions for {selected_crop} in {selected_state}")
            
        except ValueError:
            print("Please enter a valid number")
            continue

if __name__ == "__main__":
    main() 