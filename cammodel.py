import cv2
import os
import time
from datetime import datetime
import websocket
import numpy as np
import threading
import io
from PIL import Image
import argparse
import sys

def speak(message):
    print(message)

def ensure_folder_exists(folder_path):
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

def check_dependencies():
    dependencies = ['cv2', 'websocket', 'PIL', 'numpy']
    for dep in dependencies:
        try:
            _import_(dep)
        except ImportError:
            print(f"Error: {dep} is not installed. Please install it using 'pip install {dep}'.")
            sys.exit(1)

def capture_two_photos(ws_url="ws://192.168.50.183:3007", output_folder="captured_photos", max_fps=30):
    latest_frame = None
    lock = threading.Lock()
    frame_ready = threading.Event()
    connection_timeout = 60  # seconds

    def on_message(ws, message):
        nonlocal latest_frame
        try:
            if not isinstance(message, bytes):
                print("Received non-binary message, ignoring.")
                return
            img = Image.open(io.BytesIO(message))
            frame = np.array(img)
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            with lock:
                latest_frame = frame
            frame_ready.set()
        except Exception as e:
            print("Error decoding frame:", e)

    def on_error(ws, error):
        print("WebSocket error:", error)
        speak("WebSocket connection error.")

    def on_close(ws, close_status_code, close_msg):
        print("WebSocket closed:", close_msg)
        speak("WebSocket connection closed.")

    def on_open(ws):
        print("WebSocket connected")
        speak("Connected to drone camera stream.")

    try:
        check_dependencies()
        ws = websocket.WebSocketApp(
            ws_url,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
            on_open=on_open,
            header={"User-Agent": "Python-Client"}
        )
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()

        # Wait for connection or timeout
        start_time = time.time()
        while not frame_ready.is_set() and time.time() - start_time < connection_timeout:
            time.sleep(0.1)
        if not frame_ready.is_set():
            raise ConnectionError("Failed to connect to drone camera within timeout.")

        ensure_folder_exists(output_folder)

        speak("Press 'c' to capture two photos or 'q' to quit.")
        frame_interval = 1.0 / max_fps
        while True:
            start_time = time.time()
            with lock:
                frame = latest_frame.copy() if latest_frame is not None else None

            if frame is not None:
                cv2.imshow("Drone Camera", frame)
            else:
                time.sleep(0.01)
                continue

            key = cv2.waitKey(1) & 0xFF
            if key == ord('c'):
                for i in range(1):
                    with lock:
                        frame = latest_frame.copy() if latest_frame is not None else None
                    if frame is not None:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                        photo_path = os.path.join(output_folder, f"photo_{timestamp}_{i}.jpg")
                        cv2.imwrite(photo_path, frame)
                        speak(f"Photo {i} saved to {photo_path}")
                    else:
                        speak(f"Failed to capture photo {i}.")
                    time.sleep(0.1)
            elif key == ord('q'):
                speak("Exiting capture mode.")
                break

            # Control frame rate
            elapsed = time.time() - start_time
            sleep_time = max(0, frame_interval - elapsed)
            time.sleep(sleep_time)

    except Exception as e:
        print("Error in capture_two_photos:", e)
        speak("Error accessing drone camera.")
    finally:
        cv2.destroyAllWindows()
        if 'ws' in locals():
            ws.close()

if _name_ == "_main_":
    parser = argparse.ArgumentParser(description="Capture photos from a drone camera stream.")
    parser.add_argument("--ws-url", default="ws://192.168.50.183:3007", help="WebSocket URL for the drone camera")
    parser.add_argument("--output-folder", default="captured_photos", help="Folder to save captured photos")
    parser.add_argument("--max-fps", type=int, default=30, help="Maximum frame rate for display")
    args = parser.parse_args()

    capture_two_photos(
        ws_url=args.ws_url,
        output_folder=args.output_folder,
        max_fps=args.max_fps
    )