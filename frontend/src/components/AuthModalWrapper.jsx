
import React from 'react';
import { useNavigate } from 'react-router-dom';

const AuthModalWrapper = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-in fade-in duration-200 pointer-events-auto"
      onClick={() => navigate('/')}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        {children}
      </div>
    </div>
  );
};

export default AuthModalWrapper;
