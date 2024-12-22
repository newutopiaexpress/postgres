import { useState, useEffect } from 'react';
import Image from 'next/image';
import { runGenerateSQLQuery } from '@/app/actions';

interface ModelDetailsViewerProps {
  modelId: string | number;
  modelName?: string;
}

export function ModelDetailsViewer({ modelId, modelName }: ModelDetailsViewerProps) {
  const [modelDetails, setModelDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModelDetails = async () => {
      try {
        const details = await runGenerateSQLQuery(`
          SELECT 
            m.id,
            m.name,
            m.type,
            m.status,
            m.created_at,
            m."modelId" as external_id,
            p.email as user_email,
            (
              SELECT json_agg(json_build_object(
                'id', s.id,
                'uri', s.uri,
                'created_at', s.created_at
              ))
              FROM public.samples s
              WHERE s."modelId" = m.id
            ) as samples,
            (
              SELECT json_agg(json_build_object(
                'id', i.id,
                'uri', i.uri,
                'created_at', i.created_at
              ))
              FROM public.images i
              WHERE i."modelId" = m.id
            ) as generated_images
          FROM public.models m
          LEFT JOIN public.profiles p ON p.id = m.user_id
          WHERE m.id = ${modelId} OR m.name = '${modelName}'
          LIMIT 1
        `);

        setModelDetails(details[0]);
      } catch (error) {
        console.error('Failed to fetch model details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModelDetails();
  }, [modelId, modelName]);

  if (loading) {
    return <div>Loading model details...</div>;
  }

  if (!modelDetails) {
    return <div>No model details found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Model Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-2">{modelDetails.name}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>Type: {modelDetails.type}</p>
            <p>Status: {modelDetails.status}</p>
            <p>Created: {new Date(modelDetails.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p>External ID: {modelDetails.external_id}</p>
            <p>Owner: {modelDetails.user_email}</p>
          </div>
        </div>
      </div>

      {/* Samples Gallery */}
      {modelDetails.samples?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-lg font-medium">Training Samples</h4>
          <div className="grid grid-cols-4 gap-4">
            {modelDetails.samples.map((sample: any) => (
              <div key={sample.id} className="relative aspect-square">
                <Image
                  src={sample.uri}
                  alt="Training sample"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Images */}
      {modelDetails.generated_images?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-lg font-medium">Generated Images</h4>
          <div className="grid grid-cols-4 gap-4">
            {modelDetails.generated_images.map((image: any) => (
              <div key={image.id} className="relative aspect-square">
                <Image
                  src={image.uri}
                  alt="Generated image"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
