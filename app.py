import pickle
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Example of real data
# Replace with real dataset containing numeric or encoded values
X = np.array([[0, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1], [2, 0, 1, 1, 0, 1, 0]])  # Features (Replace with real data)
y = np.array([10, 20, 30])  # Groundwater levels (Replace with real data)

# Encode categorical features (if any)
# Example: If some features are categorical, use LabelEncoder to convert them to numeric
# Assuming the last column is categorical
le = LabelEncoder()
X[:, -1] = le.fit_transform(X[:, -1])

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Normalize the data using StandardScaler (to scale data to have zero mean and unit variance)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Hyperparameter tuning using GridSearchCV to find the best parameters for RandomForest
param_grid = {
    'n_estimators': [100, 200, 300],
    'max_depth': [None, 10, 20, 30],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
    'bootstrap': [True, False]
}

# Initialize the RandomForest model
rf = RandomForestRegressor(random_state=42)

# Use GridSearchCV to find the best parameters
grid_search = GridSearchCV(estimator=rf, param_grid=param_grid, cv=5, n_jobs=-1, verbose=2)
grid_search.fit(X_train_scaled, y_train)

# Get the best model from GridSearch
best_model = grid_search.best_estimator_

# Cross-validate to check model performance (e.g., R^2 score)
cv_scores = cross_val_score(best_model, X_train_scaled, y_train, cv=5)
print(f"Cross-Validation R^2 Scores: {cv_scores}")
print(f"Mean CV R^2 Score: {np.mean(cv_scores)}")

# Make predictions on the test set
y_pred = best_model.predict(X_test_scaled)

# Evaluate model performance
mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"Test MAE: {mae}")
print(f"Test MSE: {mse}")
print(f"Test R^2 Score: {r2}")

# Save both the model and the scaler for future use
with open('model.pkl', 'wb') as model_file:
    pickle.dump(best_model, model_file)

with open('scaler.pkl', 'wb') as scaler_file:
    pickle.dump(scaler, scaler_file)
