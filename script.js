const video = document.getElementById('video');
const emoji = document.getElementById('emoji');

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

// Check if face-api.js is loaded
if (typeof faceapi === 'undefined') {
    loadingMessage.textContent = 'Error: face-api.js is not loaded. Please check your internet connection.';
    console.error('face-api.js is not loaded');
} else {
    console.log('face-api.js is loaded');
}

// Check if mediaDevices is supported
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    loadingMessage.textContent = 'Camera API is not supported in your browser';
    console.error('Camera API not supported');
}

// Function to load a single model
async function loadModel(modelName) {
    try {
        console.log(`Loading ${modelName}...`);
        await faceapi.nets[modelName].loadFromUri('./models');
        console.log(`${modelName} loaded successfully`);
        return true;
    } catch (error) {
        console.error(`Error loading ${modelName}:`, error);
        return false;
    }
}

// Load models one by one
async function loadModels() {
    const models = [
        'tinyFaceDetector'  // Only need face detection model now
    ];

    for (const model of models) {
        const success = await loadModel(model);
        if (!success) {
            loadingMessage.textContent = `Error loading ${model}. Please check if model files are present in the models folder.`;
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
        loadingMessage.textContent = 'Models loaded. Requesting camera access...';
        
        // Request camera access
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: 'user'
            }
        });
        
        console.log('Camera access granted');
        video.srcObject = stream;
        loadingMessage.remove();
        
        // Initialize face detection when video starts playing
        video.addEventListener('playing', () => {
            console.log('Video started playing');
            initializeFaceDetection();
        });
        
    } catch (error) {
        console.error('Error in startApp:', error);
        loadingMessage.textContent = `Error: ${error.message}`;
    }
}

function initializeFaceDetection() {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.box').append(canvas);
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    let lastX = 0;
    let lastY = 0;

    setInterval(async () => {
        try {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            }));

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);

            if (resizedDetections.length > 0) {
                // Find the closest face (largest box area)
                const closestFace = resizedDetections.reduce((closest, current) => {
                    const currentArea = current.box.width * current.box.height;
                    const closestArea = closest.box.width * closest.box.height;
                    return currentArea > closestArea ? current : closest;
                });

                const box = closestFace.box;
                
                // Get the emoji box dimensions
                const emojiBox = document.querySelector('.box:nth-child(2)');
                const emojiRect = emojiBox.getBoundingClientRect();
                
                // Calculate face center position
                const faceCenterX = box.x + (box.width / 2);
                const faceCenterY = box.y + (box.height / 2);
                
                // Calculate emoji center offset (half of emoji size)
                const emojiWidth = emoji.offsetWidth;
                const emojiHeight = emoji.offsetHeight;
                
                // Calculate position ratios from face center
                const ratioX = faceCenterX / video.width;
                const ratioY = faceCenterY / video.height;
                
                // Calculate final position with centering offset
                const x = (ratioX * emojiRect.width) - (emojiWidth / 2);
                const y = (ratioY * emojiRect.height) - (emojiHeight / 2);
                
                // Ensure emoji stays within bounds
                const boundedX = Math.max(0, Math.min(x, emojiRect.width - emojiWidth));
                const boundedY = Math.max(0, Math.min(y, emojiRect.height - emojiHeight));
                
                // Apply position
                emoji.style.transform = `translate(${boundedX}px, ${boundedY}px)`;
                
                // Update last position for reference
                lastX = boundedX;
                lastY = boundedY;
            }
        } catch (err) {
            console.error('Error in face detection:', err);
        }
    }, 100);
}

// Start the application when the page loads
window.addEventListener('load', startApp);