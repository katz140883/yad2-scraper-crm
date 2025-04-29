import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui is used

const Layout = ({ isAuthenticated, onLogout, children }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {isAuthenticated && (
        <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">
            <Link to="/">Yad2 CRM</Link>
          </h1>
          <nav>
            {/* Add navigation links here if needed */}
            <Button variant="destructive" onClick={handleLogoutClick}>Logout</Button>
          </nav>
        </header>
      )}
      <main className={`flex-grow ${isAuthenticated ? "p-4" : ""}`}>
        {children}
      </main>
      {!isAuthenticated && (
        <footer className="bg-gray-200 text-center p-4 mt-auto">
          © 2025 Yad2 CRM
        </footer>
      )}
    </div>
  );
};

export default Layout;
