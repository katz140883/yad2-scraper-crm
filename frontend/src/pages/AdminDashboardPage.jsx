import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UserManagement from "../components/admin/UserManagement";
import SubscriptionManagement from "../components/admin/SubscriptionManagement";
import SystemStats from "../components/admin/SystemStats";

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState("stats");
  const navigate = useNavigate();

  // Check if user is admin on component mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        // Make a request to an admin-only endpoint to verify admin status
        const response = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // If not authorized as admin, redirect to main dashboard
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate("/");
      }
    };

    checkAdminStatus();
  }, [navigate]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Admin Navigation */}
      <div className="flex mb-6 space-x-2 border-b pb-2">
        <Button
          variant={activeTab === "stats" ? "default" : "outline"}
          onClick={() => {
            setActiveTab("stats");
            navigate("/admin");
          }}
        >
          System Stats
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => {
            setActiveTab("users");
            navigate("/admin/users");
          }}
        >
          User Management
        </Button>
        <Button
          variant={activeTab === "subscriptions" ? "default" : "outline"}
          onClick={() => {
            setActiveTab("subscriptions");
            navigate("/admin/subscriptions");
          }}
        >
          Subscription Management
        </Button>
      </div>

      {/* Admin Content */}
      <Routes>
        <Route path="/" element={<SystemStats />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/subscriptions" element={<SubscriptionManagement />} />
      </Routes>
    </div>
  );
};

export default AdminDashboardPage;
