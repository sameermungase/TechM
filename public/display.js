const video = document.getElementById('video');
const emoji = document.getElementById('emoji');
const displayId = new URLSearchParams(window.location.search).get('display') || 'display1';
const socket = io();

// Add loading status message
const loadingMessage = document.createElement('div');
loadingMessage.style.position = 'fixed';
loadingMessage.style.top = '50%';
loadingMessage.style.left = '50%';
loadingMessage.style.transform = 'translate(-50%, -50%)';
loadingMessage.style.padding = '20px';
loadingMessage.style.background = 'rgba(0, 0, 0, 0.8)';
loadingMessage.style.color = 'white';
loadingMessage.style.borderRadius = '10px';
loadingMessage.style.zIndex = '1000';
loadingMessage.textContent = 'Loading face detection models...';
document.body.appendChild(loadingMessage);

// Register this display with the server
socket.emit('register_display', displayId);

// Check if face-api.js is loaded
if (typeof faceapi === 'undefined') {
    const error = 'Error: face-api.js is not loaded. Please check your internet connection.';
    loadingMessage.textContent = error;
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
        loadingMessage.textContent = 'Failed to load face-api.js. Please check your internet connection.';
    };
    document.head.appendChild(script);
} else {
    console.log('face-api.js is loaded successfully');
    startApp();
}

// Function to check if a file exists
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

// Function to load a single model
async function loadModel(modelName) {
    try {
        console.log(`Starting to load ${modelName}...`);
        
        // Convert modelName to the correct format (e.g., 'tinyFaceDetector' -> 'tiny_face_detector')
        const formattedName = modelName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        console.log(`Formatted model name: ${formattedName}`);
        
        // Check if model files exist before attempting to load
        const manifestPath = `./models/${formattedName}_model-weights_manifest.json`;
        const shardPath = `./models/${formattedName}_model-shard1`;
        
        console.log(`Checking manifest at: ${manifestPath}`);
        console.log(`Checking shard at: ${shardPath}`);
        
        const manifestExists = await checkFileExists(manifestPath);
        const shardExists = await checkFileExists(shardPath);
        
        console.log(`${modelName} manifest exists:`, manifestExists);
        console.log(`${modelName} shard exists:`, shardExists);
        
        if (!manifestExists || !shardExists) {
            throw new Error(`Model files missing. Manifest: ${manifestExists}, Shard: ${shardExists}`);
        }

        // Load the model
        console.log(`Loading model from: ${manifestPath}`);
        await faceapi.nets[modelName].loadFromUri('./models');
        console.log(`${modelName} loaded successfully`);
        return true;
    } catch (error) {
        const errorMessage = `Error loading ${modelName}: ${error.message}`;
        console.error(errorMessage);
        loadingMessage.textContent = errorMessage;
        return false;
    }
}

// Load models one by one
async function loadModels() {
    const models = ['tinyFaceDetector'];
    for (const model of models) {
        const success = await loadModel(model);
        if (!success) {
            loadingMessage.textContent = `Error loading ${model}. Check console for details.`;
            return false;
        }
    }
    return true;
}

// Start the application
async function startApp() {
    try {
        console.log('Starting application...');
        const modelsLoaded = await loadModels();
        
        if (!modelsLoaded) {
            return;
        }

        console.log('All models loaded successfully');
        loadingMessage.textContent = 'Models loaded. Detecting available cameras...';
        
        // Get all available video devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log('Available video devices:', videoDevices);
        
        if (videoDevices.length === 0) {
            throw new Error('No video devices found');
        }
        
        // Parse camera index from URL if provided (e.g., camera=1)
        const params = new URLSearchParams(window.location.search);
        const cameraParam = params.get('camera');
        let selectedDevice;
        
        if (cameraParam) {
            // Try to use the camera specified in the URL
            const cameraIndex = parseInt(cameraParam, 10);
            if (!isNaN(cameraIndex) && cameraIndex >= 0 && cameraIndex < videoDevices.length) {
                selectedDevice = videoDevices[cameraIndex];
                console.log(`Using camera ${cameraIndex}: ${selectedDevice.label || 'unnamed camera'}`);
            } else {
                console.warn(`Invalid camera index ${cameraParam}, using default camera`);
                selectedDevice = videoDevices[0];
            }
        } else {
            // If no camera specified, determine based on display ID
            // For display1, use the first camera, for display2, use the second camera (if available)
            const displayIndex = displayId.match(/\d+$/);
            const cameraIndex = displayIndex ? parseInt(displayIndex[0], 10) - 1 : 0;
            
            if (cameraIndex >= 0 && cameraIndex < videoDevices.length) {
                selectedDevice = videoDevices[cameraIndex];
                console.log(`Using camera ${cameraIndex} for ${displayId}: ${selectedDevice.label || 'unnamed camera'}`);
            } else {
                selectedDevice = videoDevices[0];
                console.log(`No camera match found for ${displayId}, using default camera`);
            }
        }
        
        loadingMessage.textContent = `Models loaded. Requesting access to camera: ${selectedDevice.label || 'unnamed camera'}...`;
        
        // Request camera access with the selected device
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: selectedDevice.deviceId },
                width: 640,
                height: 480,
            }
        });
        
        console.log('Camera access granted');
        video.srcObject = stream;
        loadingMessage.remove();
        
        video.addEventListener('playing', () => {
            console.log('Video started playing');
            initializeFaceDetection();
        });
        
    } catch (error) {
        const errorMessage = `Error in startApp: ${error.message}`;
        console.error(errorMessage);
        loadingMessage.textContent = errorMessage;
    }
}

function initializeFaceDetection() {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.box').append(canvas);
    
    // Set the canvas dimensions to match the video display size, not the intrinsic video dimensions
    const videoContainer = document.querySelector('.box:first-child');
    const displaySize = {
        width: videoContainer.clientWidth,
        height: videoContainer.clientHeight
    };
    
    console.log('Video dimensions:', video.videoWidth, video.videoHeight);
    console.log('Display size:', displaySize.width, displaySize.height);
    
    // Match dimensions for face detection
    faceapi.matchDimensions(canvas, displaySize);
    
    // Style the canvas to overlay the video correctly
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    // Initialize the emoji in the center of its container
    const emojiBox = document.querySelector('.box:nth-child(2)');
    const emojiWidth = emoji.offsetWidth;
    const emojiHeight = emoji.offsetHeight;
    emoji.style.transform = `translate(${(emojiBox.clientWidth - emojiWidth) / 2}px, ${(emojiBox.clientHeight - emojiHeight) / 2}px)`;
    
    // For debug purposes
    const debugInfo = document.createElement('div');
    debugInfo.style.position = 'fixed';
    debugInfo.style.bottom = '10px';
    debugInfo.style.left = '10px';
    debugInfo.style.background = 'rgba(0, 0, 0, 0.7)';
    debugInfo.style.color = 'white';
    debugInfo.style.padding = '10px';
    debugInfo.style.borderRadius = '5px';
    debugInfo.style.fontSize = '14px';
    debugInfo.style.zIndex = '2000';
    document.body.appendChild(debugInfo);

    setInterval(async () => {
        try {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            }));

            // Update display dimensions in case of window resize
            const currentDisplaySize = {
                width: videoContainer.clientWidth,
                height: videoContainer.clientHeight
            };
            faceapi.matchDimensions(canvas, currentDisplaySize);

            const resizedDetections = faceapi.resizeResults(detections, currentDisplaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);

            debugInfo.textContent = `Faces detected: ${resizedDetections.length}`;

            if (resizedDetections.length > 0) {
                // Find the closest face (largest box area)
                const closestFace = resizedDetections.reduce((closest, current) => {
                    const currentArea = current.box.width * current.box.height;
                    const closestArea = closest.box.width * closest.box.height;
                    return currentArea > closestArea ? current : closest;
                });

                const box = closestFace.box;
                debugInfo.textContent += ` | Face: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`;
                
                // Check if face is near any edge
                const edgeThreshold = 50; // pixels from edge
                if (box.x < edgeThreshold) {
                    socket.emit('face_at_edge', {
                        displayId,
                        edge: 'left',
                        position: { x: box.x, y: box.y }
                    });
                    debugInfo.textContent += ' | Edge: LEFT';
                } else if (box.x + box.width > currentDisplaySize.width - edgeThreshold) {
                    socket.emit('face_at_edge', {
                        displayId,
                        edge: 'right',
                        position: { x: box.x, y: box.y }
                    });
                    debugInfo.textContent += ' | Edge: RIGHT';
                }

                // Update emoji position
                const emojiBox = document.querySelector('.box:nth-child(2)');
                const emojiRect = emojiBox.getBoundingClientRect();
                
                const faceCenterX = box.x + (box.width / 2);
                const faceCenterY = box.y + (box.height / 2);
                
                const emojiWidth = emoji.offsetWidth;
                const emojiHeight = emoji.offsetHeight;
                
                // Calculate position ratios from face center
                const ratioX = faceCenterX / currentDisplaySize.width;
                const ratioY = faceCenterY / currentDisplaySize.height;
                
                // Calculate the position in the emoji box
                const x = (ratioX * emojiRect.width) - (emojiWidth / 2);
                const y = (ratioY * emojiRect.height) - (emojiHeight / 2);
                
                // Ensure emoji stays within bounds
                const boundedX = Math.max(0, Math.min(x, emojiRect.width - emojiWidth));
                const boundedY = Math.max(0, Math.min(y, emojiRect.height - emojiHeight));
                
                // Apply the transformation
                emoji.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
                
                debugInfo.textContent += ` | Emoji: x=${Math.round(boundedX)}, y=${Math.round(boundedY)}`;
            }
        } catch (err) {
            console.error('Error in face detection:', err);
            debugInfo.textContent = `Error: ${err.message}`;
        }
    }, 100);
}

// Handle face approaching from another display
socket.on('face_approaching', (data) => {
    const { from, edge, position } = data;
    console.log(`Face approaching from ${from} at ${edge} edge`);
    
    // You can add special handling here for when a face approaches from another display
    // For example, you might want to highlight the edge or show a transition effect
});

// Start the application when the page loads
window.addEventListener('load', startApp); 