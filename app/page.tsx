"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  generateChartConfig,
  generateQuery,
  runGenerateSQLQuery,
  testDatabaseConnection,
} from "./actions";
import { Config, Result } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectInfo } from "@/components/project-info";
import { Results } from "@/components/results";
import { SuggestedQueries } from "@/components/suggested-queries";
import { QueryViewer } from "@/components/query-viewer";
import { Search } from "@/components/search";
import { Header } from "@/components/header";
import { LucyConnectionStatus } from "@/components/LucyConnectionStatus";
import { LatestImage } from "@/components/LatestImage";
import { LatestModels } from '@/components/LatestModels';

export default function Page() {
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [chartConfig, setChartConfig] = useState<Config | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [latestImage, setLatestImage] = useState<string | undefined>();
  const [latestModels, setLatestModels] = useState<any[]>([]);

  // Fetch initial dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const stats = await runGenerateSQLQuery(`
          SELECT 
            (SELECT COUNT(DISTINCT user_id) FROM public.models) as total_users,
            (SELECT COUNT(*) FROM public.models) as total_models,
            (SELECT COUNT(*) FROM public.models WHERE status = 'finished') as completed_models,
            (SELECT COUNT(*) FROM public.models WHERE status = 'processing') as processing_models,
            (SELECT COUNT(*) FROM public.images) as total_images,
            (SELECT COUNT(*) FROM public.samples) as total_samples,
            (SELECT SUM(credits) FROM public.credits) as total_credits
        `);
        setDashboardStats(stats[0]);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    fetchDashboardStats();
  }, []);

  // Add this useEffect to fetch the latest image
  useEffect(() => {
    const fetchLatestImage = async () => {
      try {
        const result = await runGenerateSQLQuery(`
          SELECT uri 
          FROM public.images 
          ORDER BY created_at DESC 
          LIMIT 1
        `);
        if (result && result[0]) {
          setLatestImage(result[0].uri);
        }
      } catch (error) {
        console.error('Failed to fetch latest image:', error);
      }
    };

    fetchLatestImage();
  }, []);

  // Add this useEffect
  useEffect(() => {
    const fetchLatestModels = async () => {
      try {
        const result = await runGenerateSQLQuery(`
          SELECT 
            m.id,
            m.name,
            m.type,
            m.status,
            m.created_at,
            COUNT(DISTINCT i.id) as image_count,
            COUNT(DISTINCT s.id) as sample_count,
            COALESCE(SUM(c.credits), 0) as credits_used
          FROM public.models m
          LEFT JOIN public.images i ON i."modelId" = m.id
          LEFT JOIN public.samples s ON s."modelId" = m.id
          LEFT JOIN public.credits c ON c.user_id = m.user_id
          WHERE m.status = 'finished'
          GROUP BY m.id
          ORDER BY m.created_at DESC
          LIMIT 5
        `);
        setLatestModels(result);
      } catch (error) {
        console.error('Failed to fetch latest models:', error);
      }
    };

    fetchLatestModels();
  }, []);

  const handleSubmit = async (suggestion?: string) => {
    const question = suggestion ?? inputValue;
    if (inputValue.length === 0 && !suggestion) return;
    
    clearExistingData();
    setSubmitted(true);
    setLoading(true);
    setLoadingStep(1);
    
    try {
      // Generate SQL query
      console.log('Generating query for:', question);
      const query = await generateQuery(question);
      if (!query) {
        throw new Error("Failed to generate SQL query");
      }
      
      setActiveQuery(query);
      setLoadingStep(2);
      console.log('Generated query:', query);
      
      // Execute SQL query
      console.log('Executing query...');
      const queryResults = await runGenerateSQLQuery(query);
      console.log('Query results:', queryResults);
      
      if (!queryResults || queryResults.length === 0) {
        toast.warning("No results found");
        return;
      }
      
      const cols = Object.keys(queryResults[0]);
      console.log('Columns:', cols);
      
      setResults(queryResults);
      setColumns(cols);
      
    } catch (e: any) {
      console.error("Error in handleSubmit:", e);
      toast.error(e.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInputValue(suggestion);
    try {
      await handleSubmit(suggestion);
    } catch (e) {
      toast.error("An error occurred. Please try again.");
    }
  };

  const clearExistingData = () => {
    setActiveQuery("");
    setResults([]);
    setColumns([]);
    setChartConfig(null);
  };

  const handleClear = () => {
    setSubmitted(false);
    setInputValue("");
    clearExistingData();
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      const result = await testDatabaseConnection();
      if (result.success) {
        toast.success(result.message);
        console.log('Connection details:', result.details);
        setConnectionStatus('Connected');
      } else {
        toast.error(result.message);
        console.error('Connection failed:', result.details);
        setConnectionStatus('Connection failed');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Failed to test connection';
      toast.error(errorMessage);
      console.error('Connection error:', e);
      setConnectionStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Stats and Lucy Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <LucyConnectionStatus
            status={connectionStatus}
            loading={loading}
            onTest={testConnection}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Users" value={dashboardStats?.total_users || 0} />
          <StatCard title="Active Models" value={dashboardStats?.processing_models || 0} />
          <StatCard title="Completed Models" value={dashboardStats?.completed_models || 0} />
          <StatCard title="Total Credits Used" value={dashboardStats?.total_credits || 0} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search Panel - Now wider */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Analytics Query</h2>
            <Search
              handleClear={handleClear}
              handleSubmit={handleSubmit}
              inputValue={inputValue}
              setInputValue={setInputValue}
              submitted={submitted}
            />
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <span className="ml-3 text-gray-500">
                  {loadingStep === 1 ? "Generating query..." : "Executing query..."}
                </span>
              </div>
            )}

            {activeQuery && !loading && (
              <QueryViewer
                activeQuery={activeQuery}
                inputValue={inputValue}
              />
            )}

            {results && results.length > 0 && !loading && (
              <Results
                results={results}
                chartConfig={chartConfig}
                columns={columns}
              />
            )}

            {submitted && !loading && results.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No results found
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Latest Image Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Latest Image</h2>
              <LatestImage imageUri={latestImage} />
            </div>

            {/* Latest Models Section - Replacing Quick Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Latest Completed Models</h2>
              <LatestModels models={latestModels} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep StatCard component
const StatCard = ({ title, value }: { title: string, value: number }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
    <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
    <p className="text-2xl font-semibold mt-1">{value.toLocaleString()}</p>
  </div>
);
