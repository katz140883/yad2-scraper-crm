/**
 * WebSocket Service
 * 
 * Manages WebSocket connections and broadcasting
 */

const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const url = require("url");

// Store connected clients (Map<userId, WebSocket[]>) - A user might have multiple tabs open
const clients = new Map();

/**
 * Initialize WebSocket server
 * @param {http.Server} server - The HTTP server instance
 */
function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    console.log("WebSocket client connected");

    // Authenticate user via token in query parameter (simple approach)
    const parameters = url.parse(req.url, true);
    const token = parameters.query.token;
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        
        // Store the connection associated with the user ID
        if (!clients.has(userId)) {
          clients.set(userId, []);
        }
        clients.get(userId).push(ws);
        console.log(`WebSocket client authenticated for user ${userId}`);
        
        // Send confirmation message
        ws.send(JSON.stringify({ type: "connection_ack", message: "WebSocket connected and authenticated" }));

      } catch (error) {
        console.error("WebSocket authentication error:", error.message);
        ws.close(1008, "Invalid token");
        return;
      }
    } else {
      console.log("WebSocket client connected without token, closing.");
      ws.close(1008, "Token required");
      return;
    }

    ws.on("message", (message) => {
      // Handle incoming messages if needed (e.g., ping/pong)
      console.log(`Received WebSocket message from user ${userId}: ${message}`);
    });

    ws.on("close", () => {
      console.log(`WebSocket client disconnected for user ${userId}`);
      // Remove the disconnected client from the map
      if (userId && clients.has(userId)) {
        const userConnections = clients.get(userId);
        const index = userConnections.indexOf(ws);
        if (index > -1) {
          userConnections.splice(index, 1);
        }
        // If no connections left for the user, remove the user entry
        if (userConnections.length === 0) {
          clients.delete(userId);
        }
      }
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
    });
  });

  console.log("WebSocket server initialized");
}

/**
 * Broadcast a message to all connected clients of a specific user
 * @param {number} userId - The user ID
 * @param {Object} message - The message object to send
 */
function broadcastToUser(userId, message) {
  if (clients.has(userId)) {
    const userConnections = clients.get(userId);
    const messageString = JSON.stringify(message);
    
    console.log(`Broadcasting message to user ${userId}:`, message);
    
    userConnections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
}

/**
 * Broadcast a message to all connected clients
 * @param {Object} message - The message object to send
 */
function broadcastToAll(message) {
  const messageString = JSON.stringify(message);
  console.log("Broadcasting message to all users:", message);
  
  clients.forEach((connections) => {
    connections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  });
}

module.exports = {
  initializeWebSocketServer,
  broadcastToUser,
  broadcastToAll,
};
