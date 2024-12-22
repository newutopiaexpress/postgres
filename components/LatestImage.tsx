'use client';

import React from 'react';
import Image from 'next/image';

interface LatestImageProps {
  imageUri?: string;
}

export function LatestImage({ imageUri }: LatestImageProps) {
  if (!imageUri) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg aspect-square flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">No images yet</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <Image
        src={imageUri}
        alt="Latest generated image"
        fill
        className="object-cover"
      />
    </div>
  );
}
