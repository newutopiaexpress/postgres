'use client';

import React from 'react';
import Image from 'next/image';
import { ModelImage } from '@/lib/types';

interface LatestImageProps {
  images?: ModelImage[];
}

export function LatestImage({ images }: LatestImageProps) {
  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg aspect-square flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No images yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((image, index) => (
        <div key={index} className="relative group">
          <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <Image
              src={image.uri}
              alt={`Generated image from ${image.model_name}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs truncate">
            {image.model_name}
          </div>
        </div>
      ))}
    </div>
  );
}
