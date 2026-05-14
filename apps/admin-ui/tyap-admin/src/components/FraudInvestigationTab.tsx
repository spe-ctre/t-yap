import React from 'react';

interface FraudCase {
  walletId: string;
  category: 'APP ISSUE' | 'FRAUD' | 'SUSPICIOUS ACTIVITY';
  subject: string;
  status: 'Open' | 'Investigating' | 'Resolved';
}

const mockFraudCases: FraudCase[] = [
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Unable to login to driver app',
    status: 'Open',
  },
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Payment not reflecting',
    status: 'Open',
  },
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Biometric scan failed',
    status: 'Open',
  },
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Incorrect Password',
    status: 'Open',
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Open':
      return 'bg-green-100 text-green-700';
    case 'Investigating':
      return 'bg-yellow-100 text-yellow-700';
    case 'Resolved':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const FraudInvestigationTab: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Wallet ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subject
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {mockFraudCases.map((fraudCase, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {fraudCase.walletId}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-xs font-semibold text-orange-600 uppercase">
                  {fraudCase.category}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {fraudCase.subject}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                    fraudCase.status
                  )}`}
                >
                  {fraudCase.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-green-600 hover:text-green-900">
                  Resolve
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FraudInvestigationTab;