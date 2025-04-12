from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

SPOONACULAR_API_KEY = '4f4479036ce54774bb042f84b2e9eeb6'

@app.route('/api/search-food')
def search_food():
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'error': 'Empty search query'}), 400
    
    try:
        search_url = f'https://api.spoonacular.com/food/ingredients/search?query={query}&apiKey={SPOONACULAR_API_KEY}'
        search_response = requests.get(search_url)
        search_response.raise_for_status()  
        search_data = search_response.json()
        
        if not search_data.get('results'):
            return jsonify({'results': []})
        
        detailed_results = []
        for item in search_data['results'][:3]:
            try:
                info_url = f'https://api.spoonacular.com/food/ingredients/{item["id"]}/information?amount=100&unit=grams&apiKey={SPOONACULAR_API_KEY}'
                info_response = requests.get(info_url)
                info_response.raise_for_status()
                detailed_results.append(info_response.json())
            except requests.exceptions.RequestException as e:
                print(f"Error getting details for {item['id']}: {str(e)}")
                continue
        
        if not detailed_results:
            return jsonify({'error': 'Could not retrieve nutrition details'}), 500
            
        return jsonify({'results': detailed_results})
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'error': 'Failed to search Spoonacular API',
            'details': str(e)
        }), 500
    except Exception as e:
        return jsonify({
            'error': 'An unexpected error occurred',
            'details': str(e)
        }), 500

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)