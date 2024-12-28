"use server";

import { createClient } from '@supabase/supabase-js'
import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from '@ai-sdk/openai';
import { generateObject } from "ai";
import { z } from "zod";

// Initialize Supabase client with error checking
const initSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const supabase = initSupabase();

export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // 1. Test basic connection with a simple query
    const { data: testData, error: testError } = await supabase
      .from('credits')
      .select('id')
      .limit(1);

    console.log('Basic connection test:', { data: testData, error: testError });

    if (testError) {
      console.error('Basic connection failed:', testError);
      return {
        success: false,
        message: `Basic connection failed: ${testError.message}`,
        details: { error: testError }
      };
    }

    // 2. Test RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('execute_query', {
      query_text: 'SELECT 1 as test'
    });

    console.log('RPC test:', { data: rpcData, error: rpcError });

    if (rpcError) {
      console.error('RPC function test failed:', rpcError);
      return {
        success: false,
        message: `RPC function test failed: ${rpcError.message}`,
        details: { error: rpcError }
      };
    }

    // 3. Test auth access
    const { data: authData, error: authError } = await supabase
      .from('credits')
      .select(`
        id,
        user_id,
        credits
      `)
      .limit(1);

    console.log('Auth access test:', { data: authData, error: authError });

    return {
      success: true,
      message: "Database connection successful",
      details: {
        basicTest: testData,
        rpcTest: rpcData,
        authTest: authData
      }
    };

  } catch (e: any) {
    console.error("Database connection test failed:", e);
    return {
      success: false,
      message: e.message || 'Unknown error occurred',
      details: {
        error: e,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      }
    };
  }
};

export const runGenerateSQLQuery = async (query: string) => {
  "use server";
  
  if (!query || !query.trim()) {
    throw new Error("Query cannot be empty");
  }

  try {
    console.log('Starting query execution:', query);

    const { data: rpcData, error: rpcError } = await supabase.rpc('execute_query', {
      query_text: query
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      throw new Error(`Database error: ${rpcError.message}`);
    }

    console.log('Raw RPC response:', rpcData);

    if (!rpcData) {
      console.log('No data returned');
      return [];
    }

    // Ensure we're working with an array
    const results = Array.isArray(rpcData) ? rpcData : [rpcData];
    console.log('Processed results:', results);
    
    return results as Result[];

  } catch (e: any) {
    console.error("Query execution error:", e);
    throw new Error(`Query execution failed: ${e.message}`);
  }
};

interface OpenAIResponse {
  object: {
    query: string;
  };
}

export const generateQuery = async (input: string): Promise<string> => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4"),
      system: `You are a SQL analyst for an AI model training platform. Common analysis patterns:

      1. User Activity Analysis:
        SELECT p.email, COUNT(m.id) as total_models,
          COUNT(CASE WHEN m.status = 'finished' THEN 1 END) as completed_models,
          COALESCE(SUM(c.credits), 0) as total_credits
        FROM public.profiles p
        LEFT JOIN public.models m ON p.id = m.user_id
        LEFT JOIN public.credits c ON p.id = c.user_id
        GROUP BY p.id, p.email
        ORDER BY total_models DESC LIMIT 10;

      2. Model Performance:
        SELECT m.type, 
          AVG(EXTRACT(EPOCH FROM (
            CASE WHEN m.status = 'finished' 
            THEN m.created_at - m.created_at END
          ))/3600)::numeric(10,2) as avg_hours_to_complete,
          COUNT(*) as total_models,
          COUNT(CASE WHEN m.status = 'finished' THEN 1 END) as successful_models
        FROM public.models m
        GROUP BY m.type;

      3. Credit Analysis:
        SELECT DATE_TRUNC('day', c.created_at) as date,
          COUNT(DISTINCT c.user_id) as unique_users,
          SUM(c.credits) as daily_credits
        FROM public.credits c
        GROUP BY DATE_TRUNC('day', c.created_at)
        ORDER BY date DESC;

      4. Email Search:
        SELECT p.email, STRING_AGG(m."modelId"::text, ', ') as model_ids,
          COALESCE(SUM(c.credits), 0) as total_credits,
          COUNT(CASE WHEN m.status = 'finished' THEN 1 END) as finished_models
        FROM public.profiles p
        LEFT JOIN public.models m ON p.id = m.user_id
        LEFT JOIN public.credits c ON p.id = c.user_id
        WHERE LOWER(p.email) LIKE LOWER('%search_term%')
        GROUP BY p.id, p.email;

      Always include proper JOINs, handle NULLs with COALESCE, and use meaningful column aliases.`,
      prompt: `Write a PostgreSQL query to: ${input}

      Requirements:
      1. Join profiles with models and credits
      2. Handle case-insensitive email search
      3. Group results by user
      4. Show all model IDs as comma-separated list`,
      schema: z.object({
        query: z.string(),
      }),
    }) as OpenAIResponse;
    
    let query = result.object.query.trim();
    
    // Ensure query ends with LIMIT 100
    if (!query.toLowerCase().includes('limit')) {
      query = query.replace(/;?\s*$/, ' LIMIT 100;');
    }

    // Validate and log query
    if (!query.toLowerCase().startsWith('select')) {  // Fixed: starts with -> startsWith
      throw new Error('Generated query must start with SELECT');
    }

    console.log('Generated query:', query);
    return query;
  } catch (e) {
    console.error('Query generation error:', e);
    if (e instanceof Error) {
      throw new Error(`Failed to generate query: ${e.message}`);
    } else {
      throw new Error('Failed to generate query: Unknown error occurred');
    }
  }
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `You are a SQL (postgres) expert. Explain queries for these tables:
      
      - credits: Stores user credit information
      - models: Stores AI model metadata
      - images: Stores generated images
      - samples: Stores training samples
      
      Key aspects to explain:
      1. Table joins and relationships
      2. Time-based operations
      3. Aggregations
      4. Filtering conditions
      5. Group by / Having clauses`,
      prompt: `Explain this query in simple terms:

      User Query: ${input}
      SQL Query: ${sqlQuery}`,
    });
    return result.object;
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      throw new Error(`Failed to generate explanation: ${e.message}`);
    } else {
      throw new Error("Failed to generate explanation: Unknown error occurred");
    }
  }
};

export const generateChartConfig = async (results: Result[], userQuery: string) => {
  "use server";
  try {
    const { object: config } = await generateObject({
      model: openai("gpt-4"), // Fixed model name
      system: `You are a data visualization expert. Recommend charts based on:
      - Time series: line charts for credit usage over time
      - Distributions: histograms or box plots for credit balances
      - User comparisons: bar charts for credit usage by user
      - Aggregations: pie charts for credit distribution`,
      prompt: `Suggest visualization for:
      Query: ${userQuery}
      Data: ${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });

    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    return { config: { ...config, colors } };
  } catch (e) {
    console.error('Chart configuration error:', e);
    if (e instanceof Error) {
      throw new Error(`Failed to generate chart configuration: ${e.message}`);
    } else {
      throw new Error('Failed to generate chart configuration: Unknown error occurred');
    }
  }
};

export const getDashboardStats = async () => {
  try {
    const { data, error } = await supabase.rpc('execute_query', {
      query_text: `
        SELECT 
          (SELECT COUNT(DISTINCT user_id) FROM public.models) as total_users,
          (SELECT COUNT(*) FROM public.models) as total_models,
          (SELECT COUNT(*) FROM public.models WHERE status = 'completed') as completed_models,
          (SELECT COUNT(*) FROM public.models WHERE status = 'processing') as processing_models,
          (SELECT COUNT(*) FROM public.images) as total_images,
          (SELECT COUNT(*) FROM public.samples) as total_samples,
          (SELECT SUM(credits) FROM public.credits) as total_credits
      `
    });

    if (error) throw error;
    return data?.[0] || null;
  } catch (e: any) {
    console.error("Failed to fetch dashboard stats:", e);
    return null;
  }
};