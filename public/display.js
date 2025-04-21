/**
 * Multi-Display Face Tracking System
 * Client-side component for face detection and tracking
 */

// Application Configuration
const CONFIG = {
  FACE_DETECTION: {
    MODEL: 'tinyFaceDetector',
    OPTIONS: {
      inputSize: 320,
      scoreThreshold: 0.5
    },
    EDGE_THRESHOLD: 50 // pixels from edge
  },
  UI: {
    DEBUG: true
  }
};

// DOM Elements
const elements = {
  video: document.getElementById('video'),
  emoji: document.getElementById('emoji'),
  debugInfo: null,
  loadingMessage: null
};

// Application State
const state = {
  displayId: new URLSearchParams(window.location.search).get('display') || 'display1',
  socket: io(),
  faceDetectionInterval: null,
  videoContainer: null,
  emojiContainer: null,
  isModelLoaded: false,
  selectedCamera: null
};

/**
 * Application Initialization
 */
function initializeApp() {
  // Show loading message
  showLoadingMessage('Loading face detection models...');
  
  // Register display with server
  state.socket.emit('register_display', state.displayId);
  
  // Setup socket event handlers
  setupSocketHandlers();
  
  // Check if face-api.js is loaded
  if (typeof faceapi === 'undefined') {
    handleFaceApiNotLoaded();
  } else {
    console.log('face-api.js is loaded successfully');
    startApp();
  }
}

/**
 * Create and show loading message
 * @param {string} message - The message to display
 */
function showLoadingMessage(message) {
  elements.loadingMessage = document.createElement('div');
  Object.assign(elements.loadingMessage.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '20px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    borderRadius: '10px',
    zIndex: '1000'
  });
  elements.loadingMessage.textContent = message;
  document.body.appendChild(elements.loadingMessage);
}

/**
 * Update the loading message
 * @param {string} message - The new message to display
 */
function updateLoadingMessage(message) {
  if (elements.loadingMessage) {
    elements.loadingMessage.textContent = message;
  }
}

/**
 * Remove the loading message
 */
function removeLoadingMessage() {
  if (elements.loadingMessage) {
    elements.loadingMessage.remove();
    elements.loadingMessage = null;
  }
}

/**
 * Handle case when face-api.js is not loaded
 */
function handleFaceApiNotLoaded() {
  const error = 'Error: face-api.js is not loaded. Please check your internet connection.';
  updateLoadingMessage(error);
  console.error(error);
  
  // Try to load face-api.js dynamically
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
  script.onload = () => {
    console.log('face-api.js loaded dynamically');
    startApp();
  };
  script.onerror = () => {
    console.error('Failed to load face-api.js dynamically');
    updateLoadingMessage('Failed to load face-api.js. Please check your internet connection.');
  };
  document.head.appendChild(script);
}

/**
 * Setup Socket.IO event handlers
 */
function setupSocketHandlers() {
  state.socket.on('face_approaching', (data) => {
    const { from, edge, position } = data;
    console.log(`Face approaching from ${from} at ${edge} edge`);
    
    // Add visual indication for face approaching
    showFaceApproachingIndicator(edge);
  });
}

/**
 * Show visual indication when a face is approaching from another display
 * @param {string} edge - The edge from which the face is approaching
 */
function showFaceApproachingIndicator(edge) {
  // Create or get edge indicator
  let indicator = document.getElementById('edge-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'edge-indicator';
    Object.assign(indicator.style, {
      position: 'absolute',
      background: 'rgba(255, 0, 0, 0.3)',
      zIndex: '5',
      transition: 'opacity 0.5s'
    });
    document.querySelector('.box:first-child').appendChild(indicator);
  }
  
  // Position indicator based on edge
  const container = document.querySelector('.box:first-child');
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  switch(edge) {
    case 'left':
      Object.assign(indicator.style, {
        left: '0',
        top: '0',
        width: '20px',
        height: '100%'
      });
      break;
    case 'right':
      Object.assign(indicator.style, {
        right: '0',
        top: '0',
        width: '20px',
        height: '100%'
      });
      break;
    case 'top':
      Object.assign(indicator.style, {
        left: '0',
        top: '0',
        width: '100%',
        height: '20px'
      });
      break;
    case 'bottom':
      Object.assign(indicator.style, {
        left: '0',
        bottom: '0',
        width: '100%',
        height: '20px'
      });
      break;
  }
  
  // Show indicator and fade out
  indicator.style.opacity = '1';
  setTimeout(() => {
    indicator.style.opacity = '0';
  }, 1000);
}

/**
 * Check if a file exists
 * @param {string} url - The URL to check
 * @return {Promise<boolean>} - Whether the file exists
 */
async function checkFileExists(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error(`Error checking file ${url}:`, error);
    return false;
  }
}

/**
 * Load a single face-api.js model
 * @param {string} modelName - The name of the model to load
 * @return {Promise<boolean>} - Whether the model was loaded successfully
 */
async function loadModel(modelName) {
  try {
    console.log(`Starting to load ${modelName}...`);
    
    // Convert modelName to the correct format (e.g., 'tinyFaceDetector' -> 'tiny_face_detector')
    const formattedName = modelName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    console.log(`Formatted model name: ${formattedName}`);
    
    // Check if model files exist before attempting to load
    const manifestPath = `./models/${formattedName}_model-weights_manifest.json`;
    const shardPath = `./models/${formattedName}_model-shard1`;
    
    const manifestExists = await checkFileExists(manifestPath);
    const shardExists = await checkFileExists(shardPath);
    
    if (!manifestExists || !shardExists) {
      throw new Error(`Model files missing. Manifest: ${manifestExists}, Shard: ${shardExists}`);
    }

    // Load the model
    await faceapi.nets[modelName].loadFromUri('./models');
    console.log(`${modelName} loaded successfully`);
    return true;
  } catch (error) {
    const errorMessage = `Error loading ${modelName}: ${error.message}`;
    console.error(errorMessage);
    updateLoadingMessage(errorMessage);
    return false;
  }
}

/**
 * Load all required face-api.js models
 * @return {Promise<boolean>} - Whether all models were loaded successfully
 */
async function loadModels() {
  const models = [CONFIG.FACE_DETECTION.MODEL];
  for (const model of models) {
    const success = await loadModel(model);
    if (!success) {
      updateLoadingMessage(`Error loading ${model}. Check console for details.`);
      return false;
    }
  }
  state.isModelLoaded = true;
  return true;
}

/**
 * Select the appropriate camera for this display
 * @return {Promise<MediaDeviceInfo|null>} - The selected camera device or null if none available
 */
async function selectCamera() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  
  console.log('Available video devices:', videoDevices);
  
  if (videoDevices.length === 0) {
    throw new Error('No video devices found');
  }
  
  // Parse camera index from URL if provided (e.g., camera=1)
  const params = new URLSearchParams(window.location.search);
  const cameraParam = params.get('camera');
  
  if (cameraParam) {
    // Try to use the camera specified in the URL
    const cameraIndex = parseInt(cameraParam, 10);
    if (!isNaN(cameraIndex) && cameraIndex >= 0 && cameraIndex < videoDevices.length) {
      return videoDevices[cameraIndex];
    } else {
      console.warn(`Invalid camera index ${cameraParam}, using default camera`);
      return videoDevices[0];
    }
  } else {
    // If no camera specified, determine based on display ID
    const displayIndex = state.displayId.match(/\d+$/);
    const cameraIndex = displayIndex ? parseInt(displayIndex[0], 10) - 1 : 0;
    
    if (cameraIndex >= 0 && cameraIndex < videoDevices.length) {
      return videoDevices[cameraIndex];
    } else {
      console.log(`No camera match found for ${state.displayId}, using default camera`);
      return videoDevices[0];
    }
  }
}

/**
 * Initialize the debug info panel
 */
function initializeDebugPanel() {
  if (!CONFIG.UI.DEBUG) return;
  
  elements.debugInfo = document.createElement('div');
  Object.assign(elements.debugInfo.style, {
    position: 'fixed',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    fontSize: '14px',
    zIndex: '2000'
  });
  document.body.appendChild(elements.debugInfo);
}

/**
 * Update the debug info panel
 * @param {string} message - The message to display
 */
function updateDebugInfo(message) {
  if (elements.debugInfo && CONFIG.UI.DEBUG) {
    elements.debugInfo.textContent = message;
  }
}

/**
 * Start the application
 */
async function startApp() {
  try {
    console.log('Starting application...');
    
    // Load face detection models
    const modelsLoaded = await loadModels();
    if (!modelsLoaded) return;

    console.log('All models loaded successfully');
    updateLoadingMessage('Models loaded. Detecting available cameras...');
    
    // Select appropriate camera
    state.selectedCamera = await selectCamera();
    updateLoadingMessage(`Models loaded. Requesting camera access: ${state.selectedCamera.label || 'unnamed camera'}...`);
    
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: state.selectedCamera.deviceId },
        width: 640,
        height: 480,
      }
    });
    
    console.log('Camera access granted');
    elements.video.srcObject = stream;
    
    // Mirror the video horizontally
    elements.video.style.transform = 'scaleX(-1)';
    
    removeLoadingMessage();
    
    // Initialize UI components
    initializeDebugPanel();
    
    // Start face detection when video starts playing
    elements.video.addEventListener('playing', () => {
      console.log('Video started playing');
      initializeFaceDetection();
    });
    
  } catch (error) {
    const errorMessage = `Error in startApp: ${error.message}`;
    console.error(errorMessage);
    updateLoadingMessage(errorMessage);
  }
}

/**
 * Initialize face detection
 */
function initializeFaceDetection() {
  // Get container elements
  state.videoContainer = document.querySelector('.box:first-child');
  state.emojiContainer = document.querySelector('.box:nth-child(2)');
  
  // Create canvas for face detection visualization
  const canvas = faceapi.createCanvasFromMedia(elements.video);
  state.videoContainer.append(canvas);
  
  // Set canvas dimensions and style
  const displaySize = {
    width: state.videoContainer.clientWidth,
    height: state.videoContainer.clientHeight
  };
  
  faceapi.matchDimensions(canvas, displaySize);
  Object.assign(canvas.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    transform: 'scaleX(-1)' // Mirror the canvas to match the video
  });

  // Initialize emoji position in the center
  const emojiWidth = elements.emoji.offsetWidth;
  const emojiHeight = elements.emoji.offsetHeight;
  elements.emoji.style.transform = `translate(${(state.emojiContainer.clientWidth - emojiWidth) / 2}px, ${(state.emojiContainer.clientHeight - emojiHeight) / 2}px)`;
  
  // Initially hide the emoji until a face is detected
  elements.emoji.style.display = 'none';
  
  // Start face detection loop
  state.faceDetectionInterval = setInterval(detectFaces, 100);
}

/**
 * Detect faces in the video feed
 */
async function detectFaces() {
  try {
    // Get current display dimensions
    const currentDisplaySize = {
      width: state.videoContainer.clientWidth,
      height: state.videoContainer.clientHeight
    };
    
    // Detect faces
    const detections = await faceapi.detectAllFaces(
      elements.video, 
      new faceapi.TinyFaceDetectorOptions(CONFIG.FACE_DETECTION.OPTIONS)
    );

    // Get canvas and update dimensions
    const canvas = state.videoContainer.querySelector('canvas');
    faceapi.matchDimensions(canvas, currentDisplaySize);

    // Process detections
    const resizedDetections = faceapi.resizeResults(detections, currentDisplaySize);
    
    // Clear canvas
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    // Don't draw face detections - removing the blue box
    // faceapi.draw.drawDetections(canvas, resizedDetections);

    // Update debug info
    updateDebugInfo(`Faces detected: ${resizedDetections.length}`);

    // Process largest face if any
    if (resizedDetections.length > 0) {
      // Find the largest face (closest to camera)
      const largestFace = findLargestFace(resizedDetections);
      
      // Process only the largest face
      processClosestFace([largestFace], currentDisplaySize);
      
      // Show emoji when faces are detected
      elements.emoji.style.display = 'block';
    } else {
      // Hide emoji when no faces are detected
      elements.emoji.style.display = 'none';
    }
  } catch (err) {
    console.error('Error in face detection:', err);
    updateDebugInfo(`Error: ${err.message}`);
  }
}

/**
 * Find the largest face in the detections array (closest to camera)
 * @param {Array} detections - Array of detected faces
 * @return {Object} - The largest face detection
 */
function findLargestFace(detections) {
  return detections.reduce((largest, current) => {
    const currentArea = current.box.width * current.box.height;
    const largestArea = largest.box.width * largest.box.height;
    return currentArea > largestArea ? current : largest;
  });
}

/**
 * Process the closest face to the camera
 * @param {Array} detections - Array of detected faces
 * @param {Object} displaySize - Current display dimensions
 */
function processClosestFace(detections, displaySize) {
  // Find the closest face (largest box area)
  const closestFace = detections.reduce((closest, current) => {
    const currentArea = current.box.width * current.box.height;
    const closestArea = closest.box.width * closest.box.height;
    return currentArea > closestArea ? current : closest;
  });

  const box = closestFace.box;
  updateDebugInfo(`Faces detected: ${detections.length} | Face: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`);
  
  // Adjust x position for mirrored video when checking edges
  const mirroredBox = {
    x: displaySize.width - (box.x + box.width),
    y: box.y,
    width: box.width,
    height: box.height
  };
  
  // Check if face is near any edge using the mirrored coordinates
  checkFaceAtEdge(mirroredBox, displaySize);

  // Update emoji position based on face position
  updateEmojiPosition(mirroredBox, displaySize);
}

/**
 * Check if face is near any edge and notify server
 * @param {Object} box - Face detection box (already adjusted for mirroring)
 * @param {Object} displaySize - Current display dimensions
 */
function checkFaceAtEdge(box, displaySize) {
  const edgeThreshold = CONFIG.FACE_DETECTION.EDGE_THRESHOLD;
  
  // Note: box coordinates are already adjusted for mirroring in processClosestFace
  if (box.x < edgeThreshold) {
    state.socket.emit('face_at_edge', {
      displayId: state.displayId,
      edge: 'left',
      position: { x: box.x, y: box.y }
    });
    updateDebugInfo(currentDebugInfo => `${currentDebugInfo} | Edge: LEFT`);
  } else if (box.x + box.width > displaySize.width - edgeThreshold) {
    state.socket.emit('face_at_edge', {
      displayId: state.displayId,
      edge: 'right',
      position: { x: box.x, y: box.y }
    });
    updateDebugInfo(currentDebugInfo => `${currentDebugInfo} | Edge: RIGHT`);
  }
}

/**
 * Update emoji position based on face position
 * @param {Object} box - Face detection box (already adjusted for mirroring)
 * @param {Object} displaySize - Current display dimensions
 */
function updateEmojiPosition(box, displaySize) {
  const emojiRect = state.emojiContainer.getBoundingClientRect();
  
  const faceCenterX = box.x + (box.width / 2);
  const faceCenterY = box.y + (box.height / 2);
  
  const emojiWidth = elements.emoji.offsetWidth;
  const emojiHeight = elements.emoji.offsetHeight;
  
  // Calculate position ratios from face center
  const ratioX = faceCenterX / displaySize.width;
  const ratioY = faceCenterY / displaySize.height;
  
  // Calculate the position in the emoji box
  const x = (ratioX * emojiRect.width) - (emojiWidth / 2);
  const y = (ratioY * emojiRect.height) - (emojiHeight / 2);
  
  // Ensure emoji stays within bounds
  const boundedX = Math.max(0, Math.min(x, emojiRect.width - emojiWidth));
  const boundedY = Math.max(0, Math.min(y, emojiRect.height - emojiHeight));
  
  // Apply the transformation
  elements.emoji.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
  
  updateDebugInfo(currentDebugInfo => `${currentDebugInfo} | Emoji: x=${Math.round(boundedX)}, y=${Math.round(boundedY)}`);
}

// Initialize the application when the page loads
window.addEventListener('load', initializeApp); 