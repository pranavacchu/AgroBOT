import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import os
import warnings
warnings.filterwarnings('ignore')

def load_orders():
    """
    Load SARIMAX orders from CSV file
    """
    orders_df = pd.read_csv('sarimax_orders.csv')
    return orders_df

def prepare_data(df, crop, state):
    """
    Prepare time series data for a specific crop and state
    """
    # Filter data for specific crop and state
    mask = (df['Crop'] == crop) & (df['State'] == state)
    data = df[mask].copy()
    
    # Sort by year
    data = data.sort_values('Crop_Year')
    
    # Store original yield data for R² calculation
    original_yield = data.set_index('Crop_Year')['Yield']
    
    # Create time series data for yield
    ts_data = data.set_index('Crop_Year')['Yield']
    
    # Create time series data for exogenous variables
    exog_data = pd.DataFrame(data.set_index('Crop_Year')[
        ['Annual_Rainfall', 'Fertilizer', 'Pesticide', 'Production', 'Area']
    ])
    
    # Add categorical variables
    exog_data['Season'] = data['Season'].values
    exog_data['State'] = data['State'].values
    
    # Encode categorical variables
    le_season = LabelEncoder()
    le_state = LabelEncoder()
    exog_data['Season_encoded'] = le_season.fit_transform(exog_data['Season'])
    exog_data['State_encoded'] = le_state.fit_transform(exog_data['State'])
    
    # Drop original categorical columns
    exog_data = exog_data.drop(['Season', 'State'], axis=1)
    
    # Combine target and exogenous variables for scaling
    all_data = pd.concat([ts_data, exog_data], axis=1)
    
    # Scale all variables together
    scaler = StandardScaler()
    all_scaled = pd.DataFrame(
        scaler.fit_transform(all_data),
        columns=all_data.columns,
        index=all_data.index
    )
    
    # Split back into target and exogenous
    ts_data_scaled = all_scaled[ts_data.name]
    exog_scaled = all_scaled[exog_data.columns]
    
    return ts_data_scaled, exog_scaled, le_season, le_state, scaler, original_yield

def train_sarimax_model(data, exog_data, original_yield, crop, state, orders_df, scaler):
    """
    Train SARIMAX model with custom orders from CSV
    """
    try:
        # Get custom orders for the crop-state combination
        mask = (orders_df['Crop'] == crop) & (orders_df['State'] == state)
        crop_orders = orders_df[mask].iloc[0]
        
        # Limit orders to prevent overfitting
        p = int(crop_orders['p']) # Limit AR terms
        d = int(crop_orders['d']) # Limit differencing
        q = int(crop_orders['q'])  # Limit MA terms
        
        order = (p, d, q)
        
        print(f"\nUsing custom orders for {crop} in {state}:")
        print(f"p={order[0]}, d={order[1]}, q={order[2]}")
        
        # Split data into train and test (80-20 split)
        train_size = int(len(data) * 0.8)
        train_data = data[:train_size]
        test_data = data[train_size:]
        train_exog = exog_data[:train_size]
        test_exog = exog_data[train_size:]
        train_original = original_yield[:train_size]
        test_original = original_yield[train_size:]
        
        # Fit SARIMAX model
        model = SARIMAX(train_data,
                       exog=train_exog,
                       order=order,
                       seasonal_order=(0,0,0,0),  # No seasonality for annual data
                       enforce_stationarity=False,
                       enforce_invertibility=False)
        
        results = model.fit(disp=False, maxiter=100)  # Limit iterations
        
        # Make predictions
        predictions_scaled = results.forecast(steps=len(test_data), exog=test_exog)
        
        # Create a DataFrame with the same structure as the original scaled data
        # but with zeros for all columns except the target variable
        dummy_data = pd.DataFrame(0, index=test_data.index, columns=exog_data.columns)
        dummy_data[original_yield.name] = predictions_scaled
        
        # Transform predictions back to original scale using the scaler
        predictions = scaler.inverse_transform(dummy_data)[:, 0]
        
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
        print(f"Error training model: {str(e)}")
        return None, None, None, None, None

def plot_results(train_data, test_data, predictions, crop, state, save_dir='plots'):
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
    ax1.set_title(f'Crop Yield Prediction for {crop} in {state}', 
                  fontsize=14, 
                  pad=20)
    ax1.set_xlabel('Year', fontsize=12)
    ax1.set_ylabel('Crop Yield', fontsize=12)
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
    plt.savefig(os.path.join(save_dir, f'{safe_crop}_{safe_state}_prediction.png'),
                dpi=300,
                bbox_inches='tight')
    plt.close()

def main():
    # Load data and orders
    print("Loading data and orders...")
    df = pd.read_csv('crop_yield.csv')
    orders_df = pd.read_csv('sarimax_orders.csv')
    
    # Get unique crop-state combinations
    crop_state_combinations = df[['Crop', 'State']].drop_duplicates()
    
    # Store results
    results = []
    
    # Process each crop-state combination
    for _, row in crop_state_combinations.iterrows():
        crop = row['Crop']
        state = row['State']
        
        print(f"\nProcessing {crop} in {state}")
        
        # Prepare data
        ts_data, exog_data, le_season, le_state, scaler, original_yield = prepare_data(df, crop, state)
        
        if len(ts_data) < 5:  # Skip if not enough data
            print(f"Not enough data for {crop} in {state}")
            continue
        
        # Train model and get predictions
        model, predictions, test_data, train_data, metrics = train_sarimax_model(
            ts_data, 
            exog_data,
            original_yield,
            crop,
            state,
            orders_df,
            scaler
        )
        
        if model is not None:
            # Plot results
            plot_results(train_data, test_data, predictions, crop, state)
            
            # Store results
            results.append({
                'Crop': crop,
                'State': state,
                'MSE': metrics['mse'],
                'RMSE': metrics['rmse'],
                'MAE': metrics['mae'],
                'R2': metrics['r2']
            })
            
            print(f"Model performance for {crop} in {state}:")
            print(f"RMSE: {metrics['rmse']:.2f}")
            print(f"MAE: {metrics['mae']:.2f}")
            print(f"R2: {metrics['r2']:.2f}")
    
    # Save results
    if results:
        results_df = pd.DataFrame(results)
        results_df.to_csv('model_results.csv', index=False)
        
        # Print summary statistics
        print("\nModel Performance Summary:")
        print(results_df[['RMSE', 'MAE', 'R2']].describe())
        
        # Plot overall performance
        plt.figure(figsize=(12, 6))
        sns.boxplot(data=results_df[['RMSE', 'MAE', 'R2']])
        plt.title('Model Performance Distribution')
        plt.savefig('plots/overall_performance.png')
        plt.close()

if __name__ == "__main__":
    main() 