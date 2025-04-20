import edge_tts   #text to speech engine 
import asyncio   #multipe path ko chalane ke liye
import nest_asyncio#Notebooks ya aise environments jahan asyncio pe restriction hoti hai, unke liye compatibility provide karta hai.
import requests  #HTTP requests bhejna (GET/POST).   APIs se data fetch ya send karna (e.g., weather, Flask server).
import base64  #Base64 is an encoding scheme used to convert binary data (like images, files) into text format (ASCII).
import os   #file check krna path bnana
import speech_recognition as sr
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import socketio #  real_time data(e.g., frontend se caption bhejna, command receive karna).
from time import time  #excute check karna, timestamp generate karna.
import subprocess# Python se external command ya scripts run karna.
import re   #User ke input me specific patterns dhundhna   
import random #random no ya elements select karna.
import pandas as pd  #data ko load karne, clean karne, analyze karne aur manipulate karne mein madad karti hai.

nest_asyncio.apply()

#isme text to speech use ki ha
async def edge_speak(text):
    if not text.strip():
        return
    output_folder = "audio_output"
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    audio_file = os.path.join(output_folder, f"temp_audio_{int(time() * 1000)}.mp3")
    communicate = edge_tts.Communicate(text=text, voice="en-IN-PrabhatNeural")
    await communicate.save(audio_file)
    subprocess.Popen(["start", audio_file], shell=True)
    await asyncio.sleep(1)

def speak(text):
    if not text.strip():
        return
    print("🤖 Assistant:", text)
    sio.emit("assistant_reply", {"reply": text})
    try:
        asyncio.run(edge_speak(text))
    except RuntimeError:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(edge_speak(text))

genai.configure(api_key="AIzaSyD2eKhcIIS33G7uuvjA3VkI93bun_aELvQ")
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

FIRESTORE_DATA = None

sio = socketio.Client()

@sio.event
def connect():
    print(" Connected to Socket.IO server")

@sio.event
def disconnect():
    print(" Disconnected from Socket.IO server")

sio.connect("https://fateh-2.onrender.com/", transports=["polling", "websocket"])

#isme voice reco use ki ha
def listen_and_caption():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("🎧 Listening...")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        audio = recognizer.listen(source, timeout=50)
    try:
        full_text = recognizer.recognize_google(audio).lower()
        print("🗣 You said:", full_text)
        return full_text
    except sr.UnknownValueError:
        return None
    except sr.RequestError:
        speak("Speech recognition error.")
        return None

#isme  duplicate maps use kiye ha

def get_city_coordinates(city):
    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1"
    try:
        response = requests.get(geo_url)
        data = response.json()
        if "results" in data:
            lat = data["results"][0]["latitude"]
            lon = data["results"][0]["longitude"]
            return lat, lon
        else:
            speak(f"Sorry, I couldn't find coordinates for {city}.")
            return None, None
    except Exception as e:
        print("Geocoding error:", e)
        speak("Error fetching location.")
        return None, None

def get_weather(city):
    lat, lon = get_city_coordinates(city)
    if lat is None:
        return
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}¤t=temperature_2m,wind_speed_10m,precipitation,cloudcover"
    try:
        res = requests.get(url).json()
        temp = res["current"]["temperature_2m"]
        wind = res["current"]["wind_speed_10m"]
        rain = res["current"]["precipitation"]
        msg = f"Temperature in {city} is {temp}°C with wind speed {wind} km/h."
        msg += " It is raining." if rain > 0 else " No rain."
        speak(msg)
    except Exception as e:
        print("Weather fetch error:", e)
        speak("Failed to get weather.")
#image analyse
def encode_image_to_base64(image_path):
    try:
        with open(image_path, "rb") as img:
            return "data:image/jpeg;base64," + base64.b64encode(img.read()).decode("utf-8")
    except Exception as e:
        print(f"Encoding error for {image_path}: {e}")
        return None

def send_images_to_gemini(image_folder="captured_photos"):
    url = "http://localhost:5000/analyze_frame"
    headers = {"Content-Type": "application/json"}
    images_base64 = []

    for filename in os.listdir(image_folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.avif')):
            path = os.path.join(image_folder, filename)
            encoded = encode_image_to_base64(path)
            if encoded:
                images_base64.append(encoded)

    if not images_base64:
        speak("No images found.")
        return

    data = {"images": images_base64}
    try:
        response = requests.post(url, json=data, headers=headers)
        result = response.json().get("response", "No response.")
        speak(result)
    except:
        speak("Error sending images to Gemini.")

def give_images_to_gemini(image_folder="plant_images"):
    url = "http://localhost:5000/analyze_frame"
    headers = {"Content-Type": "application/json"}
    images_base64 = []

    for filename in os.listdir(image_folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.avif')):
            path = os.path.join(image_folder, filename)
            encoded = encode_image_to_base64(path)
            if encoded:
                images_base64.append(encoded)

    if not images_base64:
        speak("No images found.")
        return

    data = {"images": images_base64}
    try:
        response = requests.post(url, json=data, headers=headers)
        result = response.json().get("response", "No response.")
        speak(result)
    except:
        speak("Error sending images to Gemini.")

def ask_gemini_with_context(query):
    global FIRESTORE_DATA
    plant_detected = None
    crop_collection = "indian_crops"

    try:
        crop_docs = [doc.to_dict() for doc in db.collection(crop_collection).stream()]
        for crop in crop_docs:
            if crop["Crop Name"].lower() in query:
                plant_detected = crop
                break
    except Exception as e:
        speak("Couldn't load crop data.")
        print("Firestore error:", e)

    if plant_detected:
        prompt = (
            
            f"You are an agriculture expert. Here is data for the crop '{plant_detected['Crop Name']}':\n"
            f"- Water Requirement: {plant_detected['Water Requirement']}\n"
            f"- Soil Type: {plant_detected['Soil Type']}\n"
            f"- Fertilizer: {plant_detected['Fertilizer']}\n"
            f"- Pesticide Suggestion: {plant_detected['Pesticide Suggestion']}\n"
            f"- Tips for Greenery: {plant_detected['Tips for Greenery']}\n"
            f"- Eco-Friendly Pest Management: {plant_detected['Eco-Friendly Pest Management']}\n\n"
            f"Question: {query}\nPlease provide a clear, short response in English."
        )
    else:
        if FIRESTORE_DATA is None:
            try:
                FIRESTORE_DATA = [doc.to_dict() for doc in db.collection("knowledge_base").stream()]
            except:
                speak("Could not load general knowledge.")
                return
        prompt = f"You are a helpful farming assistant. Based on this knowledge:\n{FIRESTORE_DATA}\n\nQuestion: {query}\nRespond clearly in simple words in English."

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        res = model.generate_content(prompt)
        speak(res.text)
    except Exception as e:
        print("Gemini Error:", e)
        speak("Could not get advice.")

def ask_crop_specific_data(query):
    crop_collection = "indian_crops"
    crop_docs = [doc.to_dict() for doc in db.collection(crop_collection).stream()]

    matched_crop = None
    for crop in crop_docs:
        if crop["Crop Name"].lower() in query:
            matched_crop = crop
            break

    if not matched_crop:
        speak("Sorry, I couldn't find crop data.")
        return

    if "soil" in query:
        speak(f"{matched_crop['Crop Name']} needs soil type: {matched_crop['Soil Type']}")
    elif "water" in query:
        speak(f"{matched_crop['Crop Name']} needs water level: {matched_crop['Water Requirement']}")
    elif "pesticide" in query:
        speak(f"Suggested pesticide for {matched_crop['Crop Name']}: {matched_crop['Pesticide Suggestion']}")
    else:
        speak(f"Here is what I found for {matched_crop['Crop Name']}: {matched_crop}")

#suggest crops
def suggest_crops_by_region_or_season(query):
    crop_docs = [doc.to_dict() for doc in db.collection("indian_crops").stream()]
    suggested = []

    if "summer" in query:
        suggested = [crop["Crop Name"] for crop in crop_docs if "summer" in crop.get("Season", "").lower()]
    elif "winter" in query:
        suggested = [crop["Crop Name"] for crop in crop_docs if "winter" in crop.get("Season", "").lower()]
    elif "rainy" in query or "monsoon" in query:
        suggested = [crop["Crop Name"] for crop in crop_docs if "rainy" in crop.get("Season", "").lower()]
    elif "punjab" in query:
        suggested = [crop["Crop Name"] for crop in crop_docs if "punjab" in crop.get("Region", "").lower()]
    elif "kerala" in query:
        suggested = [crop["Crop Name"] for crop in crop_docs if "kerala" in crop.get("Region", "").lower()]

    if suggested:
        speak(f"Suggested crops: {', '.join(suggested[:5])}")
    else:
        speak("No matching crops found for your region or season.")

#soil moisture
def get_soil_moisture():
    moisture = random.randint(200, 800) 
    if moisture < 300:
        speak(f"Soil moisture is low: {moisture}. Irrigation needed.")
    elif moisture < 600:
        speak(f"Soil moisture is optimal: {moisture}.")
    else:
        speak(f"Soil is too wet: {moisture}. Avoid overwatering.")

def query_vegetable_data(query):
    try:
        # Load Excel file
        df = pd.read_excel("final_completed_vegetables_data.xlsx")
        vegetables = df.to_dict('records')
    except FileNotFoundError:
        speak("Vegetable data file not found. Please ensure 'final_completed_vegetables_data.xlsx' is in the directory.")
        return
    except Exception as e:
        speak(f"Error loading vegetable data: {e}")
        return
 
    matched_vegetable = None
    for veg in vegetables:
        if veg["Vegetable Name"].lower() in query:
            matched_vegetable = veg
            break

    if not matched_vegetable:
        speak("Sorry, I couldn't find that vegetable in the data.")
        return
#yha pe keywords se krenge
    if "moisture" in query:
        speak(f"Ideal moisture for {matched_vegetable['Vegetable Name']} is {matched_vegetable['Ideal Moisture %']}%.")
    elif "soil" in query:
        speak(f"{matched_vegetable['Vegetable Name']} grows best in {matched_vegetable['Soil Type']} soil.")
    elif "water" in query:
        speak(f"{matched_vegetable['Vegetable Name']} requires {matched_vegetable['Water Requirement (Liters/Week)']} liters of water per week.")
    elif "fertilizer" in query or "fertiliser" in query:
        speak(f"Use {matched_vegetable['Fertilizers']} as fertilizers for {matched_vegetable['Vegetable Name']}.")
    elif "pesticide" in query:
        speak(f"Eco-friendly pesticide for {matched_vegetable['Vegetable Name']}: {matched_vegetable['Ecofriendly Pesticides']}.")
    elif "tips" in query or "greenery" in query:
        speak(f"Greenery tips for {matched_vegetable['Vegetable Name']}: {matched_vegetable['Greenery Tips']}.")
    elif "season" in query:
        speak(f"{matched_vegetable['Vegetable Name']} is best grown in the {matched_vegetable['Growing Season']} season.")
    else:
        speak(
            f"Details for {matched_vegetable['Vegetable Name']}:\n"
            f"- Ideal Moisture: {matched_vegetable['Ideal Moisture %']}%\n"
            f"- Soil Type: {matched_vegetable['Soil Type']}\n"
            f"- Growing Season: {matched_vegetable['Growing Season']}\n"
            f"- Fertilizers: {matched_vegetable['Fertilizers']}\n"
            f"- Eco-friendly Pesticides: {matched_vegetable['Ecofriendly Pesticides']}\n"
            f"- Greenery Tips: {matched_vegetable['Greenery Tips']}\n"
            f"- Water Requirement: {matched_vegetable['Water Requirement (Liters/Week)']} liters/week"
        )
def main_loop():
    speak("Vardaan bot activated for farmers. Say 'hello' or 'start' to begin.")
    while True:
        command = listen_and_caption()
        if command is None:
            continue

        if any(kw in command for kw in ["hello", "start", "wake up"]):
            sio.emit("robot_wakeup")
            speak("Hello farmer! How can I help you today?")

            while True:
                command = listen_and_caption()
                if command is None:
                    continue
                if any(kw in command for kw in ["stop", "exit", "sleep"]):
                    speak("Goodbye farmer! Say 'hello' to start again.")
                    break
                elif "first image name" in command or "what is the first image" in command:
                    speak("That's a Snake Plant, also called Sansevieria trifasciata or Mother-in-law's Tongue.")
                elif "second image name" in command or "what is the second image" in command:
                    speak("That is a asparagus fern.")
                elif "analyse" in command and "first" in command:
                    speak("Analyzing the first image for you.")
                    send_images_to_gemini()
                elif "analyse" in command and "second" in command:
                    speak("Analyzing the second image for you.")
                    give_images_to_gemini()
                elif any(kw in command for kw in ["vegetable", "", "season"]):
                    query_vegetable_data(command)
                elif "suggest crop" in command or "recommend crop" in command:
                    suggest_crops_by_region_or_season(command)
                elif "moisture" in command or "soil level" in command:
                    get_soil_moisture()
                
                elif "weather" in command or "temperature" in command:
                    city_match = re.search(r"in ([a-zA-Z\s]+)", command)
                    city = city_match.group(1).strip() if city_match else "Delhi"
                    get_weather(city)
                else:
                    ask_gemini_with_context(command)

if name == "main":
    main_loop()