import dynamic from 'next/dynamic';

const LegalQAClient = dynamic(() => import('@/components/LegalQAClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading application...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <LegalQAClient />;
} 