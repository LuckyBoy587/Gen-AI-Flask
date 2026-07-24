import os

from flask import Flask, request, jsonify
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
app = Flask(__name__)
groq = Groq(api_key=os.environ.get('GROQ_API_KEY'))


def ask_llm(prompt):
    response = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content


@app.route('/')
def hello_world():
    return 'Hello World!'


@app.route('/chat', methods=['POST'])
def chat():
    prompt = request.json['prompt']
    return ask_llm(prompt)


if __name__ == '__main__':
    app.run(debug=True)

