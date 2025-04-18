/**
 * Multi-Display Face Tracking System
 * Server component responsible for coordinating communication between displays
 */

// External dependencies
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Constants
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Display configuration
const DISPLAY_ARRANGEMENTS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
  GRID: 'grid'
};

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store connected displays and their configuration
const displays = new Map();
let displayArrangement = DISPLAY_ARRANGEMENTS.HORIZONTAL; // Default arrangement

/**
 * Express route configuration
 */
function setupRoutes() {
  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve the setup page at the /setup route
  app.get('/setup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'setup.html'));
  });

  // Serve the admin page at the /admin route
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  // Redirect root to admin page
  app.get('/', (req, res) => {
    if (!req.query.display) {
      res.redirect('/admin');
    } else {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
}

/**
 * Socket.IO event handlers
 */
function setupSocketHandlers() {
  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('register_display', (displayId) => {
      displays.set(displayId, socket.id);
      console.log(`Display ${displayId} registered`);
    });

    socket.on('set_display_arrangement', (arrangement) => {
      displayArrangement = arrangement;
      console.log(`Display arrangement set to: ${arrangement}`);
      io.emit('display_arrangement_changed', arrangement);
    });

    socket.on('face_at_edge', (data) => {
      const { displayId, edge, position } = data;
      console.log(`Face detected at ${edge} edge of display ${displayId}`);
      
      // Notify adjacent display
      const adjacentDisplayId = getAdjacentDisplayId(displayId, edge, displayArrangement);
      if (adjacentDisplayId && displays.has(adjacentDisplayId)) {
        io.to(displays.get(adjacentDisplayId)).emit('face_approaching', {
          from: displayId,
          edge: getOppositeEdge(edge),
          position: position
        });
      }
    });

    socket.on('disconnect', () => {
      // Remove display from map
      for (const [displayId, socketId] of displays.entries()) {
        if (socketId === socket.id) {
          displays.delete(displayId);
          console.log(`Display ${displayId} disconnected`);
          break;
        }
      }
    });
  });
}

/**
 * Get the ID of the adjacent display based on the current display and edge
 * @param {string} currentDisplayId - The ID of the current display
 * @param {string} edge - The edge where the face was detected ('left', 'right', 'top', 'bottom')
 * @param {string} arrangement - The arrangement of the displays ('horizontal', 'vertical', 'grid')
 * @return {string|null} - The ID of the adjacent display or null if none exists
 */
function getAdjacentDisplayId(currentDisplayId, edge, arrangement = DISPLAY_ARRANGEMENTS.HORIZONTAL) {
  // Extract the numeric part of the display ID
  const match = currentDisplayId.match(/(\d+)$/);
  if (!match) return null;
  
  const displayNumber = parseInt(match[1], 10);
  const totalDisplays = displays.size;
  
  // Handle different arrangements
  switch (arrangement) {
    case DISPLAY_ARRANGEMENTS.HORIZONTAL:
      return handleHorizontalArrangement(displayNumber, edge, totalDisplays);
      
    case DISPLAY_ARRANGEMENTS.VERTICAL:
      return handleVerticalArrangement(displayNumber, edge, totalDisplays);
      
    case DISPLAY_ARRANGEMENTS.GRID:
      return handleGridArrangement(displayNumber, edge, totalDisplays);
      
    default:
      return null;
  }
}

/**
 * Get adjacent display ID for horizontal arrangement
 */
function handleHorizontalArrangement(displayNumber, edge, totalDisplays) {
  if (edge === 'left' && displayNumber > 1) {
    return `display${displayNumber - 1}`;
  } else if (edge === 'right' && displayNumber < totalDisplays) {
    return `display${displayNumber + 1}`;
  }
  return null;
}

/**
 * Get adjacent display ID for vertical arrangement
 */
function handleVerticalArrangement(displayNumber, edge, totalDisplays) {
  if (edge === 'top' && displayNumber > 1) {
    return `display${displayNumber - 1}`;
  } else if (edge === 'bottom' && displayNumber < totalDisplays) {
    return `display${displayNumber + 1}`;
  }
  return null;
}

/**
 * Get adjacent display ID for grid arrangement
 */
function handleGridArrangement(displayNumber, edge, totalDisplays) {
  const gridSize = Math.ceil(Math.sqrt(totalDisplays));
  const row = Math.ceil(displayNumber / gridSize);
  const col = ((displayNumber - 1) % gridSize) + 1;
  
  if (edge === 'top' && row > 1) {
    // Display above
    const aboveDisplayNumber = displayNumber - gridSize;
    return aboveDisplayNumber > 0 ? `display${aboveDisplayNumber}` : null;
  } else if (edge === 'bottom' && row < gridSize) {
    // Display below
    const belowDisplayNumber = displayNumber + gridSize;
    return belowDisplayNumber <= totalDisplays ? `display${belowDisplayNumber}` : null;
  } else if (edge === 'left' && col > 1) {
    // Display to the left
    return `display${displayNumber - 1}`;
  } else if (edge === 'right' && col < gridSize) {
    // Display to the right
    const rightDisplayNumber = displayNumber + 1;
    return rightDisplayNumber <= totalDisplays ? `display${rightDisplayNumber}` : null;
  }
  return null;
}

/**
 * Get the opposite edge
 * @param {string} edge - The edge to find the opposite of
 * @return {string} - The opposite edge
 */
function getOppositeEdge(edge) {
  const opposites = {
    'left': 'right',
    'right': 'left',
    'top': 'bottom',
    'bottom': 'top'
  };
  return opposites[edge];
}

/**
 * Start the server
 */
function startServer() {
  setupRoutes();
  setupSocketHandlers();
  
  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Setup page available at http://localhost:${PORT}/setup`);
  });
}

// Initialize and start the server
startServer(); 