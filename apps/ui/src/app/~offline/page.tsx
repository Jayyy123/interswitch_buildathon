const OfflinePage = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        We could not load this page because your internet connection is unavailable. Please
        reconnect and try again.
      </p>
    </main>
  );
};

export default OfflinePage;
