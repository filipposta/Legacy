import { useNavigate } from 'react-router-dom';

function ProfileView() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/30 shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-4">Profile View</h1>
        <p className="text-gray-200 mb-6">
          This feature is currently under development. Please check back later.
        </p>
        <div className="flex justify-center">
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileView;
