import requests
import json

api_key = "AIzaSyBiQBxKIt1IGxRi9MMxNHa1v0riukZP254"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

response = requests.get(url)
data = response.json()

for model in data.get('models', []):
    print(f"Name: {model['name']}, Methods: {model['supportedGenerationMethods']}")
