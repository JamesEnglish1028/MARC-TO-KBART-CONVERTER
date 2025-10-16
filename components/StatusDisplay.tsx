import React from 'react';
import { Status } from '../types';

interface StatusDisplayProps {
  status: Status | null;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  if (!status) return null;

  const getStatusColor = () => {
    switch (status.type) {
      case 'info':
        return 'text-blue-300';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`mt-4 p-3 rounded-lg bg-gray-800 border border-gray-700 ${getStatusColor()}`}>
      <p className="font-medium">{status.message}</p>
    </div>
  );
};

export default StatusDisplay;
