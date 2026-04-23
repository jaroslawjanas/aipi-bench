"use client";

import { useState } from "react";
import Dashboard from "@/components/Dashboard";
import CommunityBench from "@/components/CommunityBench";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"server" | "community">("server");

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">AIPI Bench</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("server")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer
                ${activeTab === "server"
                  ? "bg-accent-blue text-white"
                  : "bg-bg-card text-muted hover:bg-border"
                }`}
            >
              Server
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer
                ${activeTab === "community"
                  ? "bg-accent-blue text-white"
                  : "bg-bg-card text-muted hover:bg-border"
                }`}
            >
              Community
            </button>
          </div>
        </div>

        {activeTab === "server" ? <Dashboard /> : <CommunityBench />}
      </div>
    </div>
  );
}
