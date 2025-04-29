import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const LeadList = ({ leads, onStatusUpdate }) => {
  const leadStatuses = ["new", "contacted", "interested", "meeting scheduled", "not interested"];

  const handleSendMessage = (leadId) => {
    // Placeholder: Implement API call to send WhatsApp message to this lead
    console.log(`Sending message to lead ${leadId}`);
    // Example API call:
    // const token = localStorage.getItem("token");
    // fetch(`/api/whatsapp/leads/${leadId}/message`, { method: "POST", headers: { "Authorization": `Bearer ${token}` } });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Owner Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Rooms</TableHead>
          <TableHead>Published</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center">No leads found.</TableCell>
          </TableRow>
        ) : (
          leads.map((lead) => (
            <TableRow key={lead.lead_id}>
              <TableCell>{lead.owner_name || "N/A"}</TableCell>
              <TableCell>{lead.phone_number || "N/A"}</TableCell>
              <TableCell>{lead.address || "N/A"}</TableCell>
              <TableCell>{lead.apartment_size || "N/A"}</TableCell>
              <TableCell>{lead.rooms_count || "N/A"}</TableCell>
              <TableCell>{lead.publish_date || "N/A"}</TableCell>
              <TableCell>
                <Select 
                  value={lead.status}
                  onValueChange={(newStatus) => onStatusUpdate(lead.lead_id, newStatus)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSendMessage(lead.lead_id)}
                  // Disable if message already sent or WhatsApp not ready?
                  // disabled={lead.whatsapp_message_sent || !whatsappReady}
                >
                  Send Msg
                </Button>
                {/* Add more actions like view details if needed */}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default LeadList;
