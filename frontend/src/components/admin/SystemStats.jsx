import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const SystemStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch system statistics");
        }

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err.message || "An error occurred while fetching statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Prepare data for pie chart
  const preparePieData = () => {
    if (!stats) return [];
    
    return [
      { name: 'Active Subscriptions', value: stats.activeSubscriptions },
      { name: 'Inactive Users', value: stats.totalUsers - stats.activeSubscriptions }
    ];
  };

  // Prepare data for bar chart
  const prepareBarData = () => {
    if (!stats) return [];
    
    return [
      {
        name: 'Users',
        total: stats.totalUsers,
        active: stats.activeSubscriptions
      },
      {
        name: 'WhatsApp',
        total: stats.totalUsers,
        active: stats.activeBots
      },
      {
        name: 'Leads',
        total: stats.totalLeads,
        active: Math.round(stats.totalLeads * 0.2) // Just for visualization, assuming 20% are active leads
      }
    ];
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading statistics...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-700">Total Users</h3>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-700">Active Subscriptions</h3>
                <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-yellow-700">Total Leads</h3>
                <p className="text-3xl font-bold">{stats.totalLeads}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-purple-700">Active WhatsApp Bots</h3>
                <p className="text-3xl font-bold">{stats.activeBots}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {loading ? (
            <p>Loading chart...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : stats ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={preparePieData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {preparePieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {loading ? (
            <p>Loading chart...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : stats ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareBarData()}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Total" />
                <Bar dataKey="active" fill="#82ca9d" name="Active" />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStats;
