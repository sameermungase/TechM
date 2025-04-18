const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the setup page at the /setup route
app.get('/setup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});

// Store connected displays and their configuration
const displays = new Map();
let displayArrangement = 'horizontal'; // Default: horizontal arrangement

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

function getAdjacentDisplayId(currentDisplayId, edge, arrangement = 'horizontal') {
    // Extract the numeric part of the display ID
    const match = currentDisplayId.match(/(\d+)$/);
    if (!match) return null;
    
    const displayNumber = parseInt(match[1], 10);
    
    // Get the total number of connected displays
    const totalDisplays = displays.size;
    
    // Handle different arrangements
    switch (arrangement) {
        case 'horizontal':
            // Displays are side by side horizontally
            if (edge === 'left' && displayNumber > 1) {
                return `display${displayNumber - 1}`;
            } else if (edge === 'right' && displayNumber < totalDisplays) {
                return `display${displayNumber + 1}`;
            }
            break;
            
        case 'vertical':
            // Displays are stacked vertically
            if (edge === 'top' && displayNumber > 1) {
                return `display${displayNumber - 1}`;
            } else if (edge === 'bottom' && displayNumber < totalDisplays) {
                return `display${displayNumber + 1}`;
            }
            break;
            
        case 'grid':
            // For a 2x2 grid:
            // 1 | 2
            // -----
            // 3 | 4
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
            break;
    }
    
    return null;
}

function getOppositeEdge(edge) {
    const opposites = {
        'left': 'right',
        'right': 'left',
        'top': 'bottom',
        'bottom': 'top'
    };
    return opposites[edge];
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Setup page available at http://localhost:${PORT}/setup`);
}); 