import requests
import json

api_key = "AIzaSyBiQBxKIt1IGxRi9MMxNHa1v0riukZP254"
# Try v1 instead of v1beta
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{
        "parts": [{
            "text": "Hello"
        }]
    }]
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, headers=headers, data=json.dumps(payload))
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
