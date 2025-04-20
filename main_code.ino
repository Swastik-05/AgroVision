#include <ArduinoWebsockets.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

using namespace websockets;

// WiFi Configuration
const char* ssid = "ary";
const char* password = "okzf8690";

// WebSocket Server Configuration
const char* websocket_server = "ws://192.168.50.183:8080";

// HTTP API Configuration for toggle state
const char* toggle_api = "http://192.168.50.183:3008/toggle";

// WebSocket client instance
WebsocketsClient wsClient;

// Hardware Pins
#define MOISTURE_SENSOR_1 34
#define MOISTURE_SENSOR_2 35
#define PUMP_1           32
#define PUMP_2           26

// Moisture thresholds
#define THRESHOLD_PLANT_1 2000
#define THRESHOLD_PLANT_2 2000

// Variables
int moisture1, moisture2;
bool systemEnabled = false;
unsigned long lastSendTime = 0;
unsigned long lastFetchTime = 0;
const long sendInterval = 2000;
const long fetchInterval = 5000;

void setup() {
  Serial.begin(115200);

  // Pin setup
  pinMode(MOISTURE_SENSOR_1, INPUT);
  pinMode(MOISTURE_SENSOR_2, INPUT);
  pinMode(PUMP_1, OUTPUT);
  pinMode(PUMP_2, OUTPUT);
  digitalWrite(PUMP_1, LOW);
  digitalWrite(PUMP_2, LOW);

  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Setup WebSocket
  wsClient.onMessage(onMessageCallback);
  wsClient.onEvent(onEventsCallback);
  connectWebSocket();

  // Fetch initial toggle state
  fetchToggleState();
}

void loop() {
  // Read soil moisture sensors
  moisture1 = analogRead(MOISTURE_SENSOR_1);
  moisture2 = analogRead(MOISTURE_SENSOR_2);

  // Periodic fetch from toggle API
  if (millis() - lastFetchTime >= fetchInterval) {
    fetchToggleState();
    lastFetchTime = millis();
  }

  // Control pumps based on mode and moisture
  if (systemEnabled) {
    controlPump(PUMP_1, moisture1, THRESHOLD_PLANT_1);
    controlPump(PUMP_2, moisture2, THRESHOLD_PLANT_2);
  } else {
    digitalWrite(PUMP_1, HIGH);
    digitalWrite(PUMP_2, HIGH);
  }

  // Handle WebSocket
  if (!wsClient.available()) {
    connectWebSocket();
  } else {
    wsClient.poll();
    if (millis() - lastSendTime >= sendInterval) {
      sendSensorData();
      lastSendTime = millis();
    }
  }

  delay(100);
}

void controlPump(int pumpPin, int moisture, int threshold) {
  digitalWrite(pumpPin, (moisture > threshold) ? LOW : HIGH);
}

void connectWebSocket() {
  if (wsClient.connect(websocket_server)) {
    Serial.println("Connected to WebSocket server");
  } else {
    Serial.println("WebSocket connection failed, retrying...");
    delay(5000);
  }
}

void sendSensorData() {
  String payload = String("{\"sensor1\":") + moisture1 +
                   ",\"sensor2\":" + moisture2 +
                   ",\"pump1\":" + digitalRead(PUMP_1) +
                   ",\"pump2\":" + digitalRead(PUMP_2) +
                   ",\"mode\":\"" + (systemEnabled ? "auto" : "manual") + "\"}";

  if (wsClient.send(payload)) {
    Serial.println("Sent: " + payload);
  } else {
    Serial.println("WebSocket send failed, closing...");
    wsClient.close();
  }
}

void fetchToggleState() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(toggle_api);
    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, response);
      if (!error && doc.containsKey("state")) {
        int state = doc["state"];
        systemEnabled = (state == 1);
        Serial.println("Fetched toggle state: " + String(systemEnabled ? "AUTO" : "MANUAL"));
      } else {
        Serial.println("JSON parsing error or invalid response");
      }
    } else {
      Serial.println("HTTP GET failed, code: " + String(httpCode));
    }
    http.end();
  } else {
    Serial.println("WiFi disconnected during toggle fetch");
  }
}

void onMessageCallback(WebsocketsMessage message) {
  Serial.print("WebSocket Message: ");
  Serial.println(message.data());

  // Check if toggle state is received via WebSocket
  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, message.data());
  if (!error && doc.containsKey("toggleState")) {
    int state = doc["toggleState"];
    systemEnabled = (state == 1);
    Serial.println("WebSocket toggle update: " + String(systemEnabled ? "AUTO" : "MANUAL"));
  }
}

void onEventsCallback(WebsocketsEvent event, String data) {
  if(event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("WebSocket Connected");
  } else if(event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("WebSocket Disconnected");
  } else if(event == WebsocketsEvent::GotPing) {
    Serial.println("Ping Received");
  } else if(event == WebsocketsEvent::GotPong) {
    Serial.println("Pong Received");
  }
}
