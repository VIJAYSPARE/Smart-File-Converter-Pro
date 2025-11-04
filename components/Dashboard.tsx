
import React, { useState } from 'react';
import { ConversionType } from '../types';
import { ICONS } from '../constants';
import ConversionModal from './ConversionModal';

const ConversionCard: React.FC<{ type: ConversionType; onSelect: () => void }> = ({ type, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className="group bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl dark:hover:shadow-primary-500/20 transform hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center"
    >
      <div className="text-primary-500 group-hover:text-primary-600 transition-colors duration-300">
        {ICONS[type]}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{type}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click to start conversion</p>
    </button>
  );
};

const Dashboard: React.FC = () => {
  const [selectedConversion, setSelectedConversion] = useState<ConversionType | null>(null);

  const conversionOptions: ConversionType[] = [
    ConversionType.IMAGE_TO_TEXT,
    ConversionType.IMAGE_TO_PDF,
    ConversionType.TEXT_TO_PDF,
    ConversionType.PDF_TO_WORD,
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">What would you like to convert today?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {conversionOptions.map((type) => (
          <ConversionCard key={type} type={type} onSelect={() => setSelectedConversion(type)} />
        ))}
      </div>
      {selectedConversion && (
        <ConversionModal
          type={selectedConversion}
          isOpen={!!selectedConversion}
          onClose={() => setSelectedConversion(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
