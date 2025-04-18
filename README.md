# Multi-Display Face Tracking System

A real-time face tracking system that works across multiple displays, allowing for a seamless tracking experience as users move between screens. The system uses webcams to detect faces and displays an emoji that follows facial movements.

## Features

- **Multi-Display Support**: Track faces across multiple displays with seamless transitions
- **Real-time Face Detection**: Accurate and fast face tracking using face-api.js
- **Webcam Integration**: Each display uses its own dedicated webcam
- **Customizable Display Arrangement**: Support for horizontal, vertical, and grid arrangements
- **Interactive Emoji**: An emoji that follows your face movements in real-time
- **Edge Detection**: Automatically detects when a face approaches the edge of a display
- **Setup Wizard**: Easy configuration through a user-friendly setup page
- **Debug Information**: Visual feedback for troubleshooting and development

## Setup

### Prerequisites

- Node.js (v14 or later)
- Multiple displays connected to your computer (configured in "extend" mode)
- Webcams (one for each display)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/multi-display-face-tracking.git
   cd multi-display-face-tracking
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Download the face-api.js models:
   - Create a `public/models` folder
   - Download the required models from [face-api.js models](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)
   - Required models:
     - tiny_face_detector_model
     - face_landmark_68_model
     - face_expression_model

### Running the Application

1. Start the server:
   ```bash
   npm start
   ```

2. Navigate to the setup page in your browser:
   ```
   http://localhost:3000/setup
   ```

3. Configure your displays and cameras in the setup wizard.

4. Open the generated links on each of your physical displays.

## Display Configuration

The system supports different display arrangements:

- **Horizontal**: Displays placed side by side (e.g., Display 1 | Display 2)
- **Vertical**: Displays stacked vertically (e.g., Display 1 above Display 2)
- **Grid**: Displays arranged in a grid format (e.g., 2x2 with 4 displays)

## Implementation Details

- **Server**: Express.js with Socket.IO for real-time communication
- **Face Detection**: face-api.js with TinyFaceDetector model
- **Front-end**: Pure HTML, CSS, and JavaScript
- **Communication**: WebSockets for instant messaging between displays

## Recent Updates

- Added multi-display support with configurable arrangements
- Created a setup wizard for easy configuration
- Implemented camera selection for different displays
- Added real-time face position debug information
- Enhanced display-to-display communication when faces approach screen edges
- Improved emoji positioning and tracking responsiveness
- Set up proper .gitignore to exclude model files from version control

## Troubleshooting

- **Camera Access Issues**: Ensure your browser has permission to access the webcam
- **Model Loading Errors**: Verify that all model files are in the `public/models` directory
- **Display Recognition**: Make sure your OS recognizes all connected displays in "extend" mode
- **Webcam Assignment**: Each display should have its own dedicated webcam for optimal performance

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [face-api.js](https://github.com/justadudewhohacks/face-api.js) for the face detection capabilities
- Socket.IO for the real-time communication between displays