"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import {
  generateChartConfig,
  generateQuery,
  runGenerateSQLQuery,
  testDatabaseConnection,
} from "./actions";
import { Config, Result, DashboardStats, TopUser, ModelImage } from "@/lib/types";
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
import { cn } from "@/lib/utils";  // Add this import if not already present

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [latestImages, setLatestImages] = useState<ModelImage[]>([]);
  const [latestModels, setLatestModels] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'chat'>('analytics');

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const stats = await runGenerateSQLQuery(`
          SELECT 
            (SELECT COUNT(*) FROM public.images) as total_images,
            (SELECT COUNT(*) FROM public.models) as total_models,
            (SELECT COUNT(*) FROM public.models WHERE status = 'finished') as finished_models,
            (SELECT COUNT(*) FROM public.models WHERE status = 'processing') as processing_models
        `);
        
        // Add type assertion to ensure the result matches DashboardStats interface
        const dashboardData: DashboardStats = {
          total_images: Number(stats[0].total_images),
          total_models: Number(stats[0].total_models),
          finished_models: Number(stats[0].finished_models),
          processing_models: Number(stats[0].processing_models)
        };
        
        setDashboardStats(dashboardData);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    };

    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const fetchLatestImages = async () => {
      try {
        const result = await runGenerateSQLQuery(`
          SELECT 
            i.uri,
            m.name as model_name,
            i.created_at
          FROM public.images i
          JOIN public.models m ON i."modelId" = m.id
          WHERE m.status = 'finished'
          ORDER BY i.created_at DESC
          LIMIT 24
        `); // Changed from LIMIT 4 to LIMIT 6 - adjust this number as needed
        
        if (result && result.length > 0) {
          const modelImages: ModelImage[] = result.map(item => ({
            uri: String(item.uri),
            model_name: String(item.model_name),
            created_at: String(item.created_at)
          }));
          setLatestImages(modelImages);
        }
      } catch (error) {
        console.error('Failed to fetch latest images:', error);
      }
    };

    fetchLatestImages();
  }, []);

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

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        const result = await runGenerateSQLQuery(`
          SELECT 
            p.email,
            COUNT(m.id) as model_count
          FROM public.profiles p 
          JOIN public.models m ON p.id = m.user_id 
          WHERE m.status = 'finished'
          GROUP BY p.id, p.email
          ORDER BY model_count DESC
          LIMIT 10
        `);
        
        // Add type casting to ensure the result matches TopUser interface
        const typedResult: TopUser[] = result.map(item => ({
          email: String(item.email),
          model_count: Number(item.model_count)
        }));
        
        setTopUsers(typedResult);
      } catch (error) {
        console.error('Failed to fetch top users:', error);
      }
    };

    fetchTopUsers();
  }, []);

  const chartData = {
    labels: topUsers.map(user => user.email.split('@')[0]), // Show only username part
    datasets: [
      {
        label: 'Finished Models',
        data: topUsers.map(user => user.model_count),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Top 10 Users by Finished Models',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const handleSubmit = async (suggestion?: string) => {
    const question = suggestion ?? inputValue;
    if (inputValue.length === 0 && !suggestion) return;
    
    clearExistingData();
    setSubmitted(true);
    setLoading(true);
    setLoadingStep(1);
    
    try {
      const query = await generateQuery(question);
      if (!query) {
        throw new Error("Failed to generate SQL query");
      }
      
      setActiveQuery(query);
      setLoadingStep(2);
      
      const queryResults = await runGenerateSQLQuery(query);
      
      if (!queryResults || queryResults.length === 0) {
        toast.warning("No results found");
        return;
      }
      
      const cols = Object.keys(queryResults[0]);
      
      setResults(queryResults);
      setColumns(cols);
      
    } catch (e: any) {
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
        setConnectionStatus('Connected');
      } else {
        toast.error(result.message);
        setConnectionStatus('Connection failed');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Failed to test connection';
      toast.error(errorMessage);
      setConnectionStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <LucyConnectionStatus
            status={connectionStatus}
            loading={loading}
            onTest={testConnection}
          />
        </div>

        <div className="grid grid-cols-6 gap-4 mb-8">
          <StatCard title="Total Images" value={dashboardStats?.total_images || 0} />
          <StatCard title="Total Models" value={dashboardStats?.total_models || 0} />
          <StatCard title="Finished Models" value={dashboardStats?.finished_models || 0} />
          <StatCard title="Running Models" value={dashboardStats?.processing_models || 0} />
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="h-[200px]">
              <Bar options={chartOptions} data={chartData} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Latest Completed Models</h2>
            <LatestModels models={latestModels} />
          </div>
        
          <div className="lg:col-span-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={cn(
                    "py-2 px-4 -mb-px",
                    activeTab === 'analytics'
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Analytics Query
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    "py-2 px-4 -mb-px",
                    activeTab === 'chat'
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Chat with Lucy
                </button>
              </div>
            </div>

            {activeTab === 'analytics' && (
              <div className="mt-4">
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
            )}

            {activeTab === 'chat' && (
              <div className="mt-4">
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold mb-2">Chat with Lucy</h3>
                  <p className="text-gray-500">
                    Coming soon! Chat directly with Lucy AI for natural language interactions.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Latest Model Images</h2>
            <LatestImage images={latestImages} />
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value }: { title: string, value: number }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
    <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
    <p className="text-2xl font-semibold mt-1">{value.toLocaleString()}</p>
  </div>
);
