'use client';

import React from 'react';

interface SuggestedQueriesProps {
  handleSuggestionClick: (suggestion: string) => void;
}

export function SuggestedQueries({ handleSuggestionClick }: SuggestedQueriesProps) {
  const queryGroups = [
    {
      title: "User Analysis",
      queries: [
        "Show me users with the most finished models",
        "Find users who have used more than 1000 credits",
        "List users who created models in the last 24 hours",
        "Show me users with failed or stuck models",
      ]
    },
    {
      title: "Model Performance",
      queries: [
        "What's the average time to complete a model?",
        "Show me models that took longest to finish",
        "List models with the most generated images",
        "Compare success rates between model types",
      ]
    },
    {
      title: "Credit Usage",
      queries: [
        "Show daily credit consumption trend",
        "Which model types use most credits?",
        "List users with highest credit usage per model",
        "Compare credit efficiency between model types",
      ]
    },
    {
      title: "Search by Email",
      queries: [
        "Find all data for user@example.com",
        "Show credit history for specific email",
        "List all models by email address",
        "Get stats for gmail users",
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {queryGroups.map((group) => (
        <div key={group.title} className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {group.title}
          </h3>
          <div className="space-y-2">
            {group.queries.map((query) => (
              <button
                key={query}
                onClick={() => handleSuggestionClick(query)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg 
                  bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 
                  dark:hover:bg-gray-600 transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
