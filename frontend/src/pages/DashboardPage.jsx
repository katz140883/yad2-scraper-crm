import React, { useState, useEffect, useRef } from "react";
import LeadList from "../components/LeadList";
import WhatsappConnect from "../components/WhatsappConnect";

// Placeholder for API call functions
async function fetchLeads(token) {
  try {
    const response = await fetch("/api/leads", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch leads");
    }
    return data.data.leads; // Assuming API returns { status: success, data: { leads: [...] } }
  } catch (error) {
    console.error("Fetch leads API error:", error);
    throw error;
  }
}

async function updateLeadStatusApi(leadId, status, token) {
  try {
    const response = await fetch(`/api/leads/${leadId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update lead status");
    }
    return data.data.lead; // Return updated lead
  } catch (error) {
    console.error("Update lead status API error:", error);
    throw error;
  }
}

const DashboardPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const ws = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication token not found.");
      setLoading(false);
      return;
    }

    // Fetch initial leads
    const loadLeads = async () => {
      try {
        const fetchedLeads = await fetchLeads(token);
        setLeads(fetchedLeads);
      } catch (err) {
        setError(err.message || "Failed to load leads.");
      } finally {
        setLoading(false);
      }
    };

    loadLeads();

    // Set up WebSocket connection
    // Determine WebSocket protocol (ws or wss)
    const wsProtocol = window.location.protocol === "https:";
    // Use window.location.host to get the current host and port
    const wsUrl = `${wsProtocol ? "wss" : "ws"}://${window.location.host}?token=${token}`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      // Optionally implement reconnection logic here
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("WebSocket connection error.");
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        switch (message.type) {
          case "new_lead":
            // Add new lead to the beginning of the list
            setLeads((prevLeads) => [message.data, ...prevLeads]);
            break;
          case "lead_updated":
            // Update existing lead in the list
            setLeads((prevLeads) =>
              prevLeads.map((lead) =>
                lead.lead_id === message.data.lead_id ? message.data : lead
              )
            );
            break;
          // Add cases for other message types if needed (e.g., whatsapp_status)
          default:
            console.log("Unhandled WebSocket message type:", message.type);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    // Clean up WebSocket connection on component unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };

  }, []); // Run only once on mount

  const handleStatusUpdate = async (leadId, newStatus) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Optimistically update local state
    const originalLeads = [...leads];
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.lead_id === leadId ? { ...lead, status: newStatus } : lead
      )
    );

    try {
      // Send update to backend (which will broadcast via WebSocket)
      await updateLeadStatusApi(leadId, newStatus, token);
      // No need to update state again here, as WebSocket will handle it
    } catch (err) {
      console.error("Failed to update lead status:", err);
      // Revert optimistic update on error
      setLeads(originalLeads);
      setError("Failed to update lead status. Please try again.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      
      {/* WhatsApp Connection Component */}
      <div className="mb-6">
        {/* Pass WebSocket instance or relevant data if needed */}
        <WhatsappConnect ws={ws.current} /> 
      </div>

      {/* Leads List */}
      <h3 className="text-xl font-semibold mb-2">New Leads</h3>
      {loading && <p>Loading leads...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <LeadList leads={leads} onStatusUpdate={handleStatusUpdate} />
      )}
    </div>
  );
};

export default DashboardPage;
