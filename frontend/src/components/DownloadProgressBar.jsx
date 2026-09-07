import { useState, useEffect } from 'react';
import axios from 'axios';

const DownloadProgressBar = () => {
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadId, setDownloadId] = useState(null);
  const [status, setStatus] = useState('Ready to download');
  const [stats, setStats] = useState({ processed: 0, total: 0 });
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [databaseStats, setDatabaseStats] = useState(null);
  const [operationType, setOperationType] = useState('');
  const [timing, setTiming] = useState({
    elapsed: '0s',
    remaining: 'Calculating...',
    speed: '0 docs/sec'
  });

  // Base URL for API calls (Auto-detects Vercel /api vs local localhost:3000)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

  // Format time helper function
  const formatTime = (milliseconds) => {
    if (!milliseconds) return '0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Calculate speed helper function
  const calculateSpeed = (processed, elapsedTime) => {
    if (elapsedTime === 0) return '0 docs/sec';
    const docsPerSecond = Math.round((processed / elapsedTime) * 1000);
    return `${docsPerSecond.toLocaleString()} docs/sec`;
  };

  // Check backend connection and database stats on component mount
  useEffect(() => {
    checkBackendConnection();
    getDatabaseStats();
  }, []);

  const checkBackendConnection = async () => {
    try {
      setConnectionStatus('checking');
      // UPDATED ENDPOINT: /api/health instead of /health
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 5000
      });
      setConnectionStatus('connected');
      console.log('✅ Backend connected:', response.data);
    } catch (error) {
      setConnectionStatus('disconnected');
      console.error('❌ Backend connection failed:', error.message);
    }
  };

  const getDatabaseStats = async () => {
    try {
      // UPDATED ENDPOINT: /api/database-stats instead of /database-stats
      const response = await axios.get(`${API_BASE_URL}/database-stats`);
      setDatabaseStats(response.data);
    } catch (error) {
      console.error('Error getting database stats:', error);
    }
  };

  // Poll for progress updates
  useEffect(() => {
    if (!downloadId) return;

    const interval = setInterval(async () => {
      try {
        // UPDATED ENDPOINT: /api/download-progress instead of /download-progress
        const response = await axios.get(`${API_BASE_URL}/download-progress/${downloadId}`);
        const { percentage, processed, total, type, completed, error, elapsedTime, estimatedTimeRemaining } = response.data;
        
        setProgress(percentage);
        setStats({ processed, total });
        setOperationType(type);

        // Update timing information
        if (elapsedTime !== undefined) {
          setTiming({
            elapsed: formatTime(elapsedTime),
            remaining: estimatedTimeRemaining ? formatTime(estimatedTimeRemaining) : 'Calculating...',
            speed: calculateSpeed(processed, elapsedTime)
          });
        }

        if (error) {
          setStatus(`Error: ${error}`);
          setIsGenerating(false);
          clearInterval(interval);
          return;
        }

        if (type === 'generating') {
          if (completed) {
            setStatus(`User generation complete! ✅ (${timing.elapsed})`);
            setIsGenerating(false);
            getDatabaseStats(); // Refresh stats
            clearInterval(interval);
          } else {
            setStatus(`Generating users... ${percentage}%`);
          }
        } else if (type === 'downloading') {
          if (percentage >= 100) {
            setStatus(`Download Complete! ✅ (${timing.elapsed})`);
            setIsDownloading(false);
            clearInterval(interval);
          } else {
            setStatus(`Downloading... ${percentage}%`);
          }
        }
        
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [downloadId, timing.elapsed]);

  const generateUsers = async (count = 1000000) => {
    try {
      setIsGenerating(true);
      setProgress(0);
      setStats({ processed: 0, total: count });
      setStatus('Starting user generation...');
      setTiming({
        elapsed: '0s',
        remaining: 'Calculating...',
        speed: '0 docs/sec'
      });
      
      // UPDATED ENDPOINT: /api/generate-users instead of /generate-users
      const response = await axios.post(`${API_BASE_URL}/generate-users`, {
        count: count
      });

      setDownloadId(response.data.downloadId);
      setStatus(`Generating ${count.toLocaleString()} users...`);
      
    } catch (error) {
      console.error('Generation error:', error);
      setStatus('User generation failed! ❌');
      setIsGenerating(false);
    }
  };

  const startDownload = async () => {
    try {
      setIsDownloading(true);
      setProgress(0);
      setStats({ processed: 0, total: 0 });
      setStatus('Starting download...');
      setTiming({
        elapsed: '0s',
        remaining: 'Calculating...',
        speed: '0 docs/sec'
      });
      
      const newDownloadId = Date.now().toString();
      setDownloadId(newDownloadId);
      setOperationType('downloading');

      // UPDATED ENDPOINT: /api/download-json instead of /download-json
      const response = await axios.get(`${API_BASE_URL}/download-json`, {
        responseType: 'blob',
        timeout: 300000 // 5 minute timeout for large downloads
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.json.gz');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setStatus(`Download Complete! ✅ (${timing.elapsed})`);
      setIsDownloading(false);
      
    } catch (error) {
      console.error('Download error:', error);
      if (error.response?.data?.error) {
        setStatus(`Download failed: ${error.response.data.error}`);
      } else {
        setStatus('Download failed! ❌');
      }
      setIsDownloading(false);
    }
  };

  const clearUsers = async () => {
    try {
      setStatus('Clearing users...');
      // UPDATED ENDPOINT: /api/clear-users instead of /clear-users
      await axios.delete(`${API_BASE_URL}/clear-users`);
      setStatus('Users cleared!');
      getDatabaseStats(); // Refresh stats
    } catch (error) {
      setStatus('Error clearing users');
      console.error('Clear error:', error);
    }
  };

  const resetProgress = () => {
    setProgress(0);
    setIsDownloading(false);
    setIsGenerating(false);
    setDownloadId(null);
    setStatus('Ready to download');
    setStats({ processed: 0, total: 0 });
    setOperationType('');
    setTiming({
      elapsed: '0s',
      remaining: 'Calculating...',
      speed: '0 docs/sec'
    });
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
        MongoDB User Management
      </h2>

      {/* Database Stats */}
      {databaseStats && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Database Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Database: <span className="font-medium">{databaseStats.database}</span></div>
            <div>Total Users: <span className="font-medium">{databaseStats.totalUsers}</span></div>
            <div className="col-span-2">Status: <span className="font-medium text-green-600">{databaseStats.status}</span></div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="mb-4 text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 
          connectionStatus === 'disconnected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></span>
          Backend: {connectionStatus}
        </div>
      </div>
      
      {/* Progress Bar Container */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {operationType === 'generating' ? 'Generation Progress' : 
             operationType === 'downloading' ? 'Download Progress' : 'Progress'}
          </span>
          <span className="text-sm font-bold text-blue-600">
            {Math.round(progress)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-300 ease-out ${
              operationType === 'generating' ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Stats */}
        {stats.total > 0 && (
          <div className="text-xs text-gray-500 mt-1 text-center">
            {stats.processed.toLocaleString()} / {stats.total.toLocaleString()} {operationType === 'generating' ? 'users generated' : 'documents processed'}
          </div>
        )}
      </div>

      {/* Timing Information */}
      {(isGenerating || isDownloading) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium text-gray-600">Elapsed Time</div>
              <div className="font-semibold text-blue-600">{timing.elapsed}</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">Est. Time Remaining</div>
              <div className="font-semibold text-orange-600">{timing.remaining}</div>
            </div>
            <div>
              <div className="font-medium text-gray-600">Speed</div>
              <div className="font-semibold text-green-600">{timing.speed}</div>
            </div>
          </div>
        </div>
      )}

      {/* Download Status */}
      <div className="text-center mb-6 min-h-6">
        <span className={`font-medium ${
          status.includes('Complete') || status.includes('complete') ? 'text-green-600' :
          status.includes('failed') || status.includes('Failed') || status.includes('❌') ? 'text-red-600' :
          status.includes('Starting') || status.includes('Generating') || status.includes('Downloading') || status.includes('Clearing') ? 'text-yellow-600' :
          'text-gray-500'
        }`}>
          {status}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => generateUsers(1000000)}
          disabled={isGenerating || isDownloading}
          className={`py-3 rounded-lg font-medium transition-colors ${
            isGenerating || isDownloading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isGenerating ? 'Generating...' : 'Generate 10L Users'}
        </button>

        <button
          onClick={startDownload}
          disabled={isDownloading || isGenerating}
          className={`py-3 rounded-lg font-medium transition-colors ${
            isDownloading || isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isDownloading ? 'Downloading...' : 'Download JSON'}
        </button>
      </div>

      {/* Utility Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => generateUsers(100000)}
          disabled={isGenerating || isDownloading}
          className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Generate 1L Users
        </button>
        
        <button
          onClick={clearUsers}
          disabled={isGenerating || isDownloading}
          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Clear Users
        </button>
        
        <button
          onClick={resetProgress}
          className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Reset
        </button>
      </div>

      {/* Refresh Button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => { checkBackendConnection(); getDatabaseStats(); }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Refresh Status
        </button>
      </div>

      {/* Information */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>Generate 10 lakh (1 million) fake users and download as compressed JSON</p>
        <p>Real-time timing and progress tracking with speed metrics</p>
      </div>
    </div>
  );
};

export default DownloadProgressBar;