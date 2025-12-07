import React from 'react';
import { Navigate } from 'react-router-dom';

const Index: React.FC = () => {
  return <Navigate to="/messages" replace />;
};

export default Index;
