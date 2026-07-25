import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from groq import Groq

# Load environment variables (searches for .env in parent directories as well)
load_dotenv()

app = Flask(__name__)

# Initialize the Groq client
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    # Fallback to check parent directory if needed
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
    load_dotenv(dotenv_path=dotenv_path)
    api_key = os.environ.get("GROQ_API_KEY")

client = Groq(api_key=api_key)
print("Groq client successfully initialized.")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'No query provided'}), 400
        
        query = data.get('query')
        if not query.strip():
            return jsonify({'error': 'Query cannot be empty'}), 400

        # Request response from the LLM
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful, professional, and friendly AI assistant. Give concise and structured answers."},
                {"role": "user", "content": query}
            ],
            temperature=0.4
        )
        
        output = response.choices[0].message.content.strip()
        return jsonify({'response': output})
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return jsonify({'error': f"Internal server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
