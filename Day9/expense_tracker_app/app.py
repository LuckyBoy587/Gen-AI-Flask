import os
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize Groq client
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
    load_dotenv(dotenv_path=dotenv_path)
    api_key = os.environ.get("GROQ_API_KEY")

client = Groq(api_key=api_key)
print("Groq client successfully initialized for Expense Tracker.")

# In-memory storage for expenses
expenses_db = []

def extract_expense_details(text):
    """
    Sends the user input to Groq LLM to extract amount and category as JSON.
    """
    prompt = f"""
    You are an expert data extraction assistant.
    Extract the expense details from the following user description.
    Return ONLY a valid JSON object with the keys "amount" and "category".
    Do not include any explanation, code blocks, or extra text.
    Ensure "amount" is a number (integer or float) and "category" is a lowercase string. If the amount cannot be determined, default to 0. If the category cannot be determined, default to "uncategorized".

    User Description:
    "{text}"
    """
    
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You output raw JSON. Do not wrap in markdown code blocks like ```json."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1
    )
    
    content = response.choices[0].message.content.strip()
    
    # Strip potential markdown code blocks if the model ignored the system instructions
    if content.startswith("```"):
        content = content.replace("```json", "").replace("```", "").strip()
        
    try:
        data = json.loads(content)
        return {
            "amount": float(data.get("amount", 0)),
            "category": str(data.get("category", "uncategorized")).lower().strip()
        }
    except Exception as e:
        print(f"JSON Parsing failed for: {content}. Error: {str(e)}")
        # Simple regex-based fallback if JSON parse fails
        import re
        amount_match = re.search(r'\d+(?:\.\d+)?', text)
        amount = float(amount_match.group()) if amount_match else 0.0
        return {
            "amount": amount,
            "category": "uncategorized"
        }

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/add_expense', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing field: "text" in JSON body'}), 400
        
        user_text = data.get('text')
        if not user_text.strip():
            return jsonify({'error': 'Text input cannot be empty'}), 400
            
        # Parse the input using LLM
        extracted = extract_expense_details(user_text)
        
        # Save to database
        expenses_db.append(extracted)
        
        return jsonify({
            'message': 'Expense successfully added!',
            'original_text': user_text,
            'extracted_data': extracted
        }), 200
        
    except Exception as e:
        print(f"Error in add_expense: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/view_expense', methods=['GET'])
def view_expense():
    # Calculate total spending
    total_spending = sum(item['amount'] for item in expenses_db)
    return jsonify({
        'expenses': expenses_db,
        'total_spending': total_spending
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5001)
