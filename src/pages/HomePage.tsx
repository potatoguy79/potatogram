import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-xl text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-4xl">
            🥔
          </div>
        </div>
        <h1 className="text-3xl font-semibold text-foreground">This project has been shut down.</h1>
        <p className="mt-4 text-muted-foreground">This project has been shut down.</p>
      </div>
    </div>
  );
};

export default HomePage;
