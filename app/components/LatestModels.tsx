'use client';

import React from 'react';

interface ModelData {
  id: number;
  name: string;
  type: string;
  status: string;
  created_at: string;
  image_count: number;
  sample_count: number;
  credits_used: number;
}

interface LatestModelsProps {
  models: ModelData[];
}

export function LatestModels({ models }: LatestModelsProps) {
  if (!models || models.length === 0) {
    return <div className="text-gray-500 text-center">No completed models yet</div>;
  }

  return (
    <div className="space-y-4">
      {models.map((model) => (
        <div key={model.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{model.name || 'Unnamed'}</h3>
            <span className="text-xs text-gray-500">{new Date(model.created_at).toLocaleDateString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600 dark:text-gray-300">Type: {model.type}</div>
            <div className="text-gray-600 dark:text-gray-300">Status: {model.status}</div>
            <div className="text-gray-600 dark:text-gray-300">Images: {model.image_count}</div>
            <div className="text-gray-600 dark:text-gray-300">Samples: {model.sample_count}</div>
            <div className="col-span-2 text-gray-600 dark:text-gray-300">Credits: {model.credits_used}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
