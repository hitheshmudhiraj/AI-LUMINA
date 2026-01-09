from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_API_KEY_HERE')
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

@app.route('/chat', methods=['POST'])
def chat():
    """
    Universal chat endpoint for all modules (debugger, simplifier, checker)
    """
    data = request.json
    user_message = data.get('message', '')
    module_type = data.get('module', 'debugger')  # debugger, simplifier, or checker
    
    if not user_message:
        return jsonify({"error": "No message provided"}), 400
    
    try:
        # Create module-specific prompts
        if module_type == 'debugger':
            system_prompt = """You are an expert code debugger. When given code or a description of a bug:
1. Identify all bugs and errors
2. Explain what's wrong and why
3. Provide the corrected code
4. Give tips to avoid similar issues

Format your response in a clear, conversational way. Use code blocks for code snippets."""
            
        elif module_type == 'simplifier':
            system_prompt = """You are an expert code refactoring assistant. When given code:
1. Analyze the code structure
2. Suggest simplifications and improvements
3. Provide refactored code with better variable names
4. Explain why the changes make it better

Format your response in a clear, conversational way. Use code blocks for code snippets."""
            
        elif module_type == 'checker':
            system_prompt = """You are an AI code detection expert. When given code:
1. Analyze patterns, style, and structure
2. Determine if it's likely AI-generated or human-written
3. Provide confidence percentage
4. Explain the reasoning behind your conclusion

Format your response in a clear, conversational way."""
        
        else:
            return jsonify({"error": "Invalid module type"}), 400
        
        # Combine system prompt with user message
        full_prompt = f"{system_prompt}\n\nUser request: {user_message}"
        
        # Generate response using Gemini
        response = model.generate_content(full_prompt)
        ai_response = response.text
        
        return jsonify({
            "response": ai_response,
            "module": module_type
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "error": f"Failed to generate response: {str(e)}"
        }), 500

@app.route('/')
def index():
    """Serve the root index.html"""
    return send_from_directory('.', 'index.html')

@app.route('/dashboard')
def dashboard():
    """Serve the dashboard.html"""
    return send_from_directory('.', 'dashboard.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (css, js, assets, data)"""
    return send_from_directory('.', path)

if __name__ == '__main__':
    print("=" * 60)
    print("AI Luminators Backend Server")
    print("=" * 60)
    print(f"Server running on: http://localhost:5000")
    print(f"Gemini API configured: {GEMINI_API_KEY != 'YOUR_API_KEY_HERE'}")
    if GEMINI_API_KEY == 'YOUR_API_KEY_HERE':
        print("\n⚠️  WARNING: Gemini API key not configured!")
        print("   Create a .env file with: GEMINI_API_KEY=your_key_here")
        print("   Get your key from: https://makersuite.google.com/app/apikey")
    print("=" * 60)
    app.run(port=5000, debug=True)
