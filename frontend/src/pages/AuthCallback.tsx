import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export function AuthCallback() {
  const [params] = useSearchParams();
  const { setToken } = useAuthStore();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setToken(token);
      window.location.href = '/search';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}
