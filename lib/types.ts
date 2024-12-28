import { z } from "zod";

export type Unicorn = {
  id: number;
  company: string;
  valuation: number;
  date_joined: Date | null;
  country: string;
  city: string;
  industry: string;
  select_investors: string;
};

export type Result = Record<string, string | number>;

export const explanationSchema = z.object({
  section: z.string(),
  explanation: z.string(),
});
export const explanationsSchema = z.array(explanationSchema);

export type QueryExplanation = z.infer<typeof explanationSchema>;

// Define the schema for chart configuration
export const configSchema = z
  .object({
    description: z
      .string()
      .describe(
        "Describe the chart. What is it showing? What is interesting about the way the data is displayed?",
      ),
    takeaway: z.string().describe("What is the main takeaway from the chart?"),
    type: z.enum(["bar", "line", "area", "pie"]).describe("Type of chart"),
    title: z.string(),
    xKey: z.string().describe("Key for x-axis or category"),
    yKeys: z.array(z.string()).describe("Key(s) for y-axis values this is typically the quantitative column"),
    multipleLines: z.boolean().describe("For line charts only: whether the chart is comparing groups of data.").optional(),
    measurementColumn: z.string().describe("For line charts only: key for quantitative y-axis column to measure against (eg. values, counts etc.)").optional(),
    lineCategories: z.array(z.string()).describe("For line charts only: Categories used to compare different lines or data series. Each category represents a distinct line in the chart.").optional(),
    colors: z
      .record(
        z.string().describe("Any of the yKeys"),
        z.string().describe("Color value in CSS format (e.g., hex, rgb, hsl)"),
      )
      .describe("Mapping of data keys to color values for chart elements")
      .optional(),
    legend: z.boolean().describe("Whether to show legend"),
  })
  .describe("Chart configuration object");

export type Config = z.infer<typeof configSchema>;

export type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  session_id?: string;
};

export type ChatSession = {
  id: string;
  created_at: string;
  title: string;
  user_id?: string;
};

export interface TopUser {
  email: string;
  model_count: number;
}

export interface DashboardStats {
  total_images: number;
  total_models: number;
  finished_models: number;
  processing_models: number;
}

export interface ImageResult {
  uri: string;
}
