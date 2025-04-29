import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder for API call functions
async function getWhatsappStatus(token) {
  try {
    const response = await fetch("/api/whatsapp/status", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to get WhatsApp status");
    }
    return data.data; // Assuming API returns { status: success, data: { ... } }
  } catch (error) {
    console.error("Get WhatsApp status API error:", error);
    throw error;
  }
}

async function initializeWhatsapp(token) {
  try {
    const response = await fetch("/api/whatsapp/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to initialize WhatsApp");
    }
    return data;
  } catch (error) {
    console.error("Initialize WhatsApp API error:", error);
    throw error;
  }
}

async function disconnectWhatsapp(token) {
  try {
    const response = await fetch("/api/whatsapp/disconnect", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to disconnect WhatsApp");
    }
    return data;
  } catch (error) {
    console.error("Disconnect WhatsApp API error:", error);
    throw error;
  }
}

const WhatsappConnect = () => {
  const [status, setStatus] = useState("loading"); // loading, disconnected, qr_pending, connected, error
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  const fetchStatus = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const data = await getWhatsappStatus(token);
      if (data.ready) {
        setStatus("connected");
        setQrCode(null);
      } else if (data.qrCode) {
        setStatus("qr_pending");
        setQrCode(data.qrCode);
      } else {
        setStatus("disconnected");
        setQrCode(null);
      }
      setError("");
    } catch (err) {
      setError(err.message || "Failed to fetch status.");
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchStatus();
    // TODO: Set up WebSocket listener for real-time status updates
    // const ws = new WebSocket("ws://your-backend-ws-url");
    // ws.onmessage = (event) => {
    //   const message = JSON.parse(event.data);
    //   if (message.type === "whatsapp_status") {
    //     // Update status based on message.payload
    //     fetchStatus(); // Re-fetch status or update directly
    //   }
    // };
    // return () => ws.close();
  }, []);

  const handleInitialize = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingAction(true);
    setError("");
    try {
      await initializeWhatsapp(token);
      // Status should update via WebSocket or polling, but fetch manually for now
      await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for QR
      fetchStatus(); 
    } catch (err) {
      setError(err.message || "Failed to initialize.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDisconnect = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingAction(true);
    setError("");
    try {
      await disconnectWhatsapp(token);
      setStatus("disconnected");
      setQrCode(null);
    } catch (err) {
      setError(err.message || "Failed to disconnect.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Connection</CardTitle>
        <CardDescription>Connect your WhatsApp account to send automated messages.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-500 mb-4">Error: {error}</p>}
        
        {status === "loading" && <p>Loading status...</p>}
        
        {status === "disconnected" && (
          <div>
            <p className="mb-4">WhatsApp is not connected.</p>
            <Button onClick={handleInitialize} disabled={loadingAction}>
              {loadingAction ? "Initializing..." : "Connect WhatsApp"}
            </Button>
          </div>
        )}

        {status === "qr_pending" && qrCode && (
          <div>
            <p className="mb-4">Scan this QR code with your WhatsApp app:</p>
            <div style={{ background: "white", padding: "16px", display: "inline-block" }}>
              <QRCode value={qrCode} size={256} />
            </div>
            <p className="mt-4 text-sm text-gray-600">Waiting for scan...</p>
          </div>
        )}

        {status === "connected" && (
          <div>
            <p className="mb-4 text-green-600 font-semibold">WhatsApp Connected</p>
            <Button variant="destructive" onClick={handleDisconnect} disabled={loadingAction}>
              {loadingAction ? "Disconnecting..." : "Disconnect WhatsApp"}
            </Button>
          </div>
        )}
        
        {status === "error" && (
           <Button onClick={fetchStatus} disabled={loadingAction}>
              {loadingAction ? "Retrying..." : "Retry Status Check"}
            </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsappConnect;
