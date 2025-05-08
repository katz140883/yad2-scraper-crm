const express = require("express");
const cors = require("cors");
const http = require("http"); // Import http module
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const leadRoutes = require("./routes/leads");
const adminRoutes = require("./routes/admin");
const whatsappRoutes = require("./routes/whatsapp");

const { initializeWebSocketServer } = require("./services/websocketService"); // Import WebSocket service
const { initializeAllActiveClients } = require("./services/whatsappService"); // Import WhatsApp service initializer

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // For parsing application/json

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// Basic route for testing
app.get("/", (req, res) => {
  res.send("Yad2 CRM Backend is running!");
});

// Error Handling Middleware (Basic)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

// Use PORT from environment variable for Railway, default to 8080
const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0"; // Listen on all interfaces for container environments

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initializeWebSocketServer(server);

// Start the server
server.listen(PORT, HOST, () => {
  console.log(`Server running on host ${HOST} and port ${PORT}`);
  
  // Initialize WhatsApp clients for active users on startup
  initializeAllActiveClients();
});


// dotenv configuration confirmed
