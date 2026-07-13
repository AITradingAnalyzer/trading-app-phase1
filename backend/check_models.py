import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load variables from .env if you have one
load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ Error: GOOGLE_API_KEY not found in environment variables.")
    print("Make sure you have a .env file or have set the variable in your terminal.")
else:
    try:
        genai.configure(api_key=api_key)
        print("\n📋 Available Models for your API Key:")
        print("-" * 50)
        
        models = [m for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        if not models:
            print("No models found that support content generation.")
        
        for m in models:
            print(f"✅ {m.name}")
            
        print("-" * 50)
    except Exception as e:
        print(f"❌ API Error: {e}")
