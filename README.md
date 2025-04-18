# Face Tracking Emoji

This web application tracks your face using your webcam and displays a corresponding emoji that moves with your face movements and changes based on your facial expressions.

## Setup

1. Download the face-api.js models:
   - Create a `models` folder in the root directory
   - Download the required models from [face-api.js models](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)
   - Required models:
     - tiny_face_detector_model
     - face_landmark_68_model
     - face_expression_model

2. Serve the files using a local web server. You can use Python's built-in server:
   ```bash
   python -m http.server
   ```
   Or use any other local development server.

3. Open the website in your browser and allow camera access when prompted.

## Features

- Real-time face tracking
- Emoji movement that follows your face
- Emoji changes based on your facial expressions
- Clean, modern interface with two side-by-side boxes

## Requirements

- Modern web browser with camera access
- Webcam
- Internet connection (for loading face-api.js)