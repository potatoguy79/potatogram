import React from 'react';

const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-4xl">
            🥔
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">This project has been shut down.</h1>
        <p className="text-muted-foreground mt-4">This project has been shut down.</p>
      </div>

      <div className="w-full py-4 px-4 flex items-center justify-center text-xs text-muted-foreground">
        <span>This project has been shut down.</span>
      </div>
    </div>
  );
};

export default AuthPage;
