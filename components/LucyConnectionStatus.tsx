interface LucyConnectionStatusProps {
  status: string;
  loading: boolean;
  onTest: () => void;
}

export function LucyConnectionStatus({ status, loading, onTest }: LucyConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'Connected':
        return 'bg-green-500 hover:bg-green-600';
      case 'Error':
      case 'Connection failed':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  return (
    <button
      onClick={onTest}
      disabled={loading}
      className={`px-4 py-2 rounded text-white transition-colors ${getStatusColor()} disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {loading ? (
        <>
          <span className="animate-spin">⌛</span>
          Testing...
        </>
      ) : (
        <>
          <span>🤖</span>
          {status || "Test Database Connection"}
        </>
      )}
    </button>
  );
}
