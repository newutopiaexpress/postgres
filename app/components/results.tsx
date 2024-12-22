'use client';

import React from 'react';
import { Result } from "@/lib/types";
import Image from "next/image";

interface ResultsProps {
  results: Result[];
  chartConfig: any;
  columns: string[];
}

export function Results({ results, chartConfig, columns }: ResultsProps) {
  console.log('Results component:', { results, columns });

  if (!results || results.length === 0) {
    return <div className="text-center py-4">No results to display</div>;
  }

  const hasImages = columns.includes('uri');

  // Helper function to validate image URL
  const isValidImageUrl = (url: any): url is string => {
    if (typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Image Grid (if URIs present) */}
      {hasImages && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {results.map((row, i) => 
            isValidImageUrl(row.uri) ? (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <Image
                  src={row.uri}
                  alt={`Image ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm overflow-x-auto">
        <h3 className="text-lg font-medium mb-4">Results Table</h3>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {results.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                  >
                    {String(row[column] ?? 'N/A')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
