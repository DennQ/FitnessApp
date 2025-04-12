const SPOONACULAR_API_KEY = '4f4479036ce54774bb042f84b2e9eeb6';
let lastSearchTime = 0;
const SEARCH_DELAY = 1000; 

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tabs').addEventListener('click', function(e) {
        if (e.target.classList.contains('tab-button')) {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            e.target.classList.add('active');
            const tabId = e.target.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        }
    });

    initNutritionTracker();
    initHydrationTracker();
    initCalculators();
    initProgressTracker();
});

function initNutritionTracker() {
    const foodSearch = document.getElementById('food-search');
    const searchBtn = document.getElementById('search-btn');
    const foodResults = document.getElementById('food-results');
    const customFoodForm = document.getElementById('custom-food-form');

    loadFoodLog();
    updateNutritionSummary();

    searchBtn.addEventListener('click', searchFood);
    foodSearch.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchFood();
    });

    customFoodForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const foodName = document.getElementById('food-name').value;
        const calories = parseFloat(document.getElementById('calories').value) || 0;
        const protein = parseFloat(document.getElementById('protein').value) || 0;
        const carbs = parseFloat(document.getElementById('carbs').value) || 0;
        const fat = parseFloat(document.getElementById('fat').value) || 0;

        if (!foodName) {
            alert('Please enter a food name');
            return;
        }

        addFoodToLog({
            name: foodName,
            calories: calories,
            protein: protein,
            carbs: carbs,
            fat: fat
        });

        this.reset();
    });

    async function searchFood() {
        const query = foodSearch.value.trim();
        if (!query) {
            foodResults.innerHTML = '<p>Please enter a search term</p>';
            return;
        }

        const now = Date.now();
        if (now - lastSearchTime < SEARCH_DELAY) {
            foodResults.innerHTML = '<p>Please wait a moment before searching again</p>';
            return;
        }
        lastSearchTime = now;

        foodResults.innerHTML = '<div class="loading">Searching...</div>';

        try {
            const response = await fetch(`/api/search-food?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            if (!data.results || data.results.length === 0) {
                foodResults.innerHTML = '<p>No results found</p>';
                return;
            }

            displayFoodResults(data.results);
        } catch (error) {
            console.error('Search error:', error);
            foodResults.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        }
    }

    function displayFoodResults(foods) {
        foodResults.innerHTML = '';
        foods.forEach(food => {
            const nutrition = food.nutrition || {};
            const nutrients = nutrition.nutrients || [];
            
            const calories = nutrients.find(n => n.name === "Calories")?.amount || 0;
            const protein = nutrients.find(n => n.name === "Protein")?.amount || 0;
            const carbs = nutrients.find(n => n.name === "Carbohydrates")?.amount || 0;
            const fat = nutrients.find(n => n.name === "Fat")?.amount || 0;

            const foodItem = document.createElement('div');
            foodItem.className = 'food-item';
            foodItem.innerHTML = `
                <div>
                    <strong>${food.name}</strong>
                    <div class="food-macros">
                        ${Math.round(calories)} cal | 
                        P: ${Math.round(protein)}g | 
                        C: ${Math.round(carbs)}g | 
                        F: ${Math.round(fat)}g
                    </div>
                </div>
                <button class="add-food"
                    data-name="${food.name}"
                    data-calories="${Math.round(calories)}"
                    data-protein="${Math.round(protein)}"
                    data-carbs="${Math.round(carbs)}"
                    data-fat="${Math.round(fat)}">
                    Add
                </button>
            `;

            foodResults.appendChild(foodItem);
        });

        document.querySelectorAll('.add-food').forEach(btn => {
            btn.addEventListener('click', function() {
                addFoodToLog({
                    name: this.dataset.name,
                    calories: parseFloat(this.dataset.calories),
                    protein: parseFloat(this.dataset.protein),
                    carbs: parseFloat(this.dataset.carbs),
                    fat: parseFloat(this.dataset.fat)
                });
            });
        });
    }

    function addFoodToLog(food) {
        const today = new Date().toISOString().split('T')[0];
        let foodLog = JSON.parse(localStorage.getItem('foodLog')) || {};

        if (!foodLog[today]) {
            foodLog[today] = [];
        }

        foodLog[today].push(food);
        localStorage.setItem('foodLog', JSON.stringify(foodLog));
        
        loadFoodLog();
        updateNutritionSummary();
    }

    function loadFoodLog() {
        const foodLogElement = document.getElementById('food-log');
        const foodData = JSON.parse(localStorage.getItem('foodLog')) || {};
        const sortedDates = Object.keys(foodData).sort((a, b) => new Date(b) - new Date(a));

        foodLogElement.innerHTML = '<h3>Food History</h3>';

        if (sortedDates.length === 0) {
            foodLogElement.innerHTML += '<p>No food history available</p>';
            return;
        }

        sortedDates.forEach(date => {
            const dateHeader = document.createElement('div');
            dateHeader.className = 'log-date-header';
            dateHeader.innerHTML = `<h4>${new Date(date).toLocaleDateString()}</h4>`;
            foodLogElement.appendChild(dateHeader);

            const dayLog = document.createElement('div');
            dayLog.className = 'day-log';

            foodData[date].forEach((food, index) => {
                const foodItem = document.createElement('div');
                foodItem.className = 'food-item';
                foodItem.innerHTML = `
                    <div>
                        <strong>${food.name}</strong>
                        <div class="food-macros">
                            ${food.calories} cal | P: ${food.protein}g | 
                            C: ${food.carbs}g | F: ${food.fat}g
                        </div>
                    </div>
                    <button class="remove-food" data-date="${date}" data-index="${index}">
                        ×
                    </button>
                `;
                dayLog.appendChild(foodItem);
            });

            foodLogElement.appendChild(dayLog);
        });

        document.querySelectorAll('.remove-food').forEach(btn => {
            btn.addEventListener('click', function() {
                removeFoodFromLog(this.dataset.date, parseInt(this.dataset.index));
            });
        });
    }

    function removeFoodFromLog(date, index) {
        let foodLog = JSON.parse(localStorage.getItem('foodLog')) || {};
        if (foodLog[date] && foodLog[date][index]) {
            foodLog[date].splice(index, 1);
            if (foodLog[date].length === 0) {
                delete foodLog[date];
            }
            localStorage.setItem('foodLog', JSON.stringify(foodLog));
            loadFoodLog();
            updateNutritionSummary();
        }
    }

    function updateNutritionSummary() {
        const today = new Date().toISOString().split('T')[0];
        const foodLog = JSON.parse(localStorage.getItem('foodLog')) || {};
        const todayFoods = foodLog[today] || [];

        let totals = todayFoods.reduce((acc, food) => {
            acc.calories += food.calories || 0;
            acc.protein += food.protein || 0;
            acc.carbs += food.carbs || 0;
            acc.fat += food.fat || 0;
            return acc;
        }, {calories: 0, protein: 0, carbs: 0, fat: 0});

        document.getElementById('calories-total').textContent = Math.round(totals.calories);
        document.getElementById('protein-total').textContent = Math.round(totals.protein) + 'g';
        document.getElementById('carbs-total').textContent = Math.round(totals.carbs) + 'g';
        document.getElementById('fat-total').textContent = Math.round(totals.fat) + 'g';
    }
}

function initHydrationTracker() {
    const waterAddButtons = document.querySelectorAll('.water-add');
    const customWaterForm = document.getElementById('custom-water-form'); 
    
    loadHydrationData();

    waterAddButtons.forEach(button => {
        button.addEventListener('click', function() {
            const amount = parseInt(this.getAttribute('data-amount'));
            addWater(amount);
        });
    });

    if (customWaterForm) {
        customWaterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const customAmount = parseInt(document.getElementById('custom-water-amount').value);
            if (!isNaN(customAmount) && customAmount > 0) {
                addWater(customAmount);
                this.reset();
            } else {
                alert('Please enter a valid amount');
            }
        });
    }

    function addWater(amount) {
        const today = new Date().toISOString().split('T')[0];
        let hydrationData = JSON.parse(localStorage.getItem('hydrationData')) || {};

        if (!hydrationData[today]) {
            hydrationData[today] = {
                consumed: 0,
                goal: 2000
            };
        }

        hydrationData[today].consumed += amount;
        localStorage.setItem('hydrationData', JSON.stringify(hydrationData));
        
        loadHydrationData();
    }

    function loadHydrationData() {
        const waterLogElement = document.getElementById('water-log');
        const hydrationData = JSON.parse(localStorage.getItem('hydrationData')) || {};
        const sortedDates = Object.keys(hydrationData).sort((a, b) => new Date(b) - new Date(a));

        waterLogElement.innerHTML = '<h3>Hydration History</h3>';

        if (sortedDates.length === 0) {
            waterLogElement.innerHTML += '<p>No hydration data available</p>';
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const todayData = hydrationData[today] || { consumed: 0, goal: 2000 };
        document.getElementById('water-consumed').textContent = todayData.consumed;
        document.getElementById('water-goal').textContent = todayData.goal;

        sortedDates.forEach(date => {
            const entry = document.createElement('div');
            entry.className = 'water-entry';

            const percentage = Math.round((hydrationData[date].consumed / hydrationData[date].goal) * 100);
            let statusClass = percentage >= 100 ? 'success' : 
                            percentage >= 50 ? 'warning' : 'danger';

            entry.innerHTML = `
                <div class="water-date">${new Date(date).toLocaleDateString()}</div>
                <div class="water-bar-container">
                    <div class="water-bar ${statusClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div class="water-amount">
                    ${hydrationData[date].consumed} / ${hydrationData[date].goal} ml
                    (${percentage}%)
                </div>
            `;
            waterLogElement.appendChild(entry);
        });
    }
}

function initCalculators() {
    const bmiForm = document.getElementById('bmi-form');
    const bmiResult = document.getElementById('bmi-result');
    
    bmiForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const height = parseFloat(document.getElementById('bmi-height').value);
        const weight = parseFloat(document.getElementById('bmi-weight').value);
        
        if (height && weight) {
            const heightInMeters = height / 100;
            const bmi = weight / (heightInMeters * heightInMeters);
            let category = '';
            
            if (bmi < 18.5) {
                category = 'Underweight';
            } else if (bmi < 25) {
                category = 'Normal weight';
            } else if (bmi < 30) {
                category = 'Overweight';
            } else {
                category = 'Obese';
            }
            
            bmiResult.innerHTML = `
                <h4>Your BMI: ${bmi.toFixed(1)}</h4>
                <p>Category: ${category}</p>
                <div class="bmi-scale">
                    <span class="${bmi < 18.5 ? 'active' : ''}">Underweight (<18.5)</span>
                    <span class="${bmi >= 18.5 && bmi < 25 ? 'active' : ''}">Normal (18.5-24.9)</span>
                    <span class="${bmi >= 25 && bmi < 30 ? 'active' : ''}">Overweight (25-29.9)</span>
                    <span class="${bmi >= 30 ? 'active' : ''}">Obese (30+)</span>
                </div>
            `;
        }
    });
    
    const bmrForm = document.getElementById('bmr-form');
    const bmrResult = document.getElementById('bmr-result');
    
    bmrForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const gender = document.getElementById('bmr-gender').value;
        const age = parseInt(document.getElementById('bmr-age').value);
        const height = parseFloat(document.getElementById('bmr-height').value);
        const weight = parseFloat(document.getElementById('bmr-weight').value);
        const activityLevel = parseFloat(document.getElementById('bmr-activity').value);
        
        if (gender && age && height && weight && activityLevel) {
            let bmr;
            
            if (gender === 'male') {
                bmr = 10 * weight + 6.25 * height - 5 * age + 5;
            } else {
                bmr = 10 * weight + 6.25 * height - 5 * age - 161;
            }
            
            const maintenanceCalories = Math.round(bmr * activityLevel);
            
            bmrResult.innerHTML = `
                <h4>Your BMR: ${Math.round(bmr)} calories/day</h4>
                <p>Maintenance calories: ${maintenanceCalories} calories/day</p>
                <div class="calorie-targets">
                    <div>
                        <h5>Weight Loss (0.5kg/week)</h5>
                        <p>${maintenanceCalories - 500} calories/day</p>
                    </div>
                    <div>
                        <h5>Weight Gain (0.5kg/week)</h5>
                        <p>${maintenanceCalories + 500} calories/day</p>
                    </div>
                </div>
            `;
        }
    });
}

function initProgressTracker() {
    const weightForm = document.getElementById('weight-form');
    const weightChartCtx = document.getElementById('weight-chart').getContext('2d');
    const projectionForm = document.getElementById('projection-form');
    const projectionResult = document.getElementById('projection-result');
    
    let weightChart;
    
    initWeightChart();
    
    weightForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const date = document.getElementById('weight-date').value;
        const weight = parseFloat(document.getElementById('weight-value').value);
        
        if (date && weight) {
            addWeightEntry(date, weight);
            weightForm.reset();
        }
    });
    
    projectionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const days = parseInt(document.getElementById('projection-days').value);
        const dailyCalories = parseInt(document.getElementById('projection-calories').value);
        
        if (days && dailyCalories) {
            calculateWeightProjection(days, dailyCalories);
        }
    });
    
    function initWeightChart() {
        try {
            const weightData = JSON.parse(localStorage.getItem('weightData')) || [];
            
            const labels = weightData.map(entry => entry.date);
            const data = weightData.map(entry => entry.weight);
            
            weightChart = new Chart(weightChartCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Weight (kg)',
                        data: data,
                        borderColor: '#4a6fa5',
                        backgroundColor: 'rgba(74, 111, 165, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing weight chart:', error);
        }
    }
    
    function addWeightEntry(date, weight) {
        try {
            let weightData = JSON.parse(localStorage.getItem('weightData')) || [];
            
            const existingIndex = weightData.findIndex(entry => entry.date === date);
            
            if (existingIndex !== -1) {
                weightData[existingIndex].weight = weight;
            } else {
                weightData.push({ date, weight });
                weightData.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
            
            localStorage.setItem('weightData', JSON.stringify(weightData));
            
            updateWeightChart();
        } catch (error) {
            console.error('Error adding weight entry:', error);
        }
    }
    
    function updateWeightChart() {
        try {
            const weightData = JSON.parse(localStorage.getItem('weightData')) || [];
            
            weightChart.data.labels = weightData.map(entry => entry.date);
            weightChart.data.datasets[0].data = weightData.map(entry => entry.weight);
            weightChart.update();
        } catch (error) {
            console.error('Error updating weight chart:', error);
        }
    }
    
    function calculateWeightProjection(days, dailyCalories) {
        try {
            const weightData = JSON.parse(localStorage.getItem('weightData')) || [];
            const bmrData = JSON.parse(localStorage.getItem('bmrData')) || {};
            
            if (weightData.length === 0) {
                projectionResult.innerHTML = '<p>No weight data available for projection.</p>';
                return;
            }
            
            const currentWeight = weightData[weightData.length - 1].weight;
            
            let bmr = bmrData.bmr;
            if (!bmr) {
                bmr = 10 * currentWeight + 6.25 * 170 - 5 * 30 + 5; 
            }
            
            const calorieDifference = dailyCalories - bmr;
            
            const weightChangePerDay = calorieDifference / 7700;
            const projectedWeightChange = weightChangePerDay * days;
            const projectedWeight = currentWeight + projectedWeightChange;
            
            projectionResult.innerHTML = `
                <h4>Weight Projection</h4>
                <p>Current weight: ${currentWeight.toFixed(1)} kg</p>
                <p>Projected weight after ${days} days: ${projectedWeight.toFixed(1)} kg</p>
                <p>Projected change: ${projectedWeightChange > 0 ? '+' : ''}${projectedWeightChange.toFixed(1)} kg</p>
                <div class="projection-chart">
                    <canvas id="projection-chart"></canvas>
                </div>
            `;
            
            const projectionChartCtx = document.getElementById('projection-chart').getContext('2d');
            
            const dates = [];
            const weights = [];
            const today = new Date();
            
            for (let i = 0; i <= days; i += Math.ceil(days / 10)) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                dates.push(date.toISOString().split('T')[0]);
                
                const dayWeight = currentWeight + (weightChangePerDay * i);
                weights.push(dayWeight);
            }
            
            new Chart(projectionChartCtx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Projected Weight (kg)',
                        data: weights,
                        borderColor: '#ff7e5f',
                        backgroundColor: 'rgba(255, 126, 95, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error calculating weight projection:', error);
            projectionResult.innerHTML = '<p class="error">Error calculating projection</p>';
        }
    }
}