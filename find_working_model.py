import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

models_to_try = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro',
    'models/gemini-1.5-flash',
    'models/gemini-pro'
]

for model_name in models_to_try:
    print(f"Trying {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hi")
        print(f"✅ {model_name} worked! Response: {response.text[:10]}...")
        break
    except Exception as e:
        print(f"❌ {model_name} failed: {e}")
