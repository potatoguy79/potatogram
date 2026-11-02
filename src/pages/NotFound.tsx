import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="text-center max-w-lg">
        <h1 className="mb-4 text-4xl font-bold">This project has been shut down.</h1>
        <p className="mb-4 text-xl text-muted-foreground">This project has been shut down.</p>
      </div>
    </div>
  );
};

export default NotFound;
