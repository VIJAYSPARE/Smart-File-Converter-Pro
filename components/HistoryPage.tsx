
import React from 'react';
import { useHistory } from '../hooks/useHistory';
import { ConversionTask } from '../types';

const HistoryItem: React.FC<{ item: ConversionTask; onRemove: (id: string) => void }> = ({ item, onRemove }) => {

    const handleDownload = () => {
        const { output, outputFileName } = item;
        const url = output instanceof Blob ? URL.createObjectURL(output) : `data:text/plain;charset=utf-8,${encodeURIComponent(output)}`;
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', outputFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (output instanceof Blob) {
            URL.revokeObjectURL(url);
        }
    };
    
    return (
        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {new Date(item.date).toLocaleString()}
            </td>
            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 truncate max-w-xs">{item.fileName}</td>
            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.type}</td>
            <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={handleDownload} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-200 mr-4">Download</button>
                <button onClick={() => onRemove(item.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">Delete</button>
            </td>
        </tr>
    );
};


const HistoryPage: React.FC = () => {
    const { history, removeHistoryItem, clearHistory } = useHistory();

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Conversion History</h2>
                {history.length > 0 && (
                    <button 
                        onClick={clearHistory}
                        className="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition-colors"
                    >
                        Clear All History
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No conversions yet</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by converting a file from the dashboard.</p>
                </div>
            ) : (
                <div className="shadow overflow-hidden border-b border-gray-200 dark:border-gray-700 sm:rounded-lg bg-white dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Original File(s)</th>
                                <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Conversion Type</th>
                                <th scope="col" className="relative px-5 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {history.map(item => (
                                <HistoryItem key={item.id} item={item} onRemove={removeHistoryItem} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
