import React, { useState, useEffect } from 'react';
import { testBackendConnection } from '@/services/api';

export const ConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<{
    connected: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await testBackendConnection();
      setStatus(result);
    } catch (error) {
      setStatus({
        connected: false,
        message: 'Errore durante il test di connessione',
        details: error
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="p-4 border rounded-lg max-w-md">
      <h3 className="text-lg font-semibold mb-3">🔌 Test Connessione Backend</h3>
      
      <button 
        onClick={testConnection}
        disabled={loading}
        className="mb-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Connessione'}
      </button>

      {status && (
        <div className={`p-3 rounded ${status.connected ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
          <div className="flex items-center mb-2">
            <span className={`w-3 h-3 rounded-full mr-2 ${status.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">{status.connected ? '✅ Connesso' : '❌ Non connesso'}</span>
          </div>
          <p className="text-sm text-gray-700">{status.message}</p>
          {status.details && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-gray-600">Dettagli</summary>
              <pre className="mt-1 bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(status.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
