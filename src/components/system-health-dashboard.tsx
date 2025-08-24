
"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { runHealthCheck, SystemHealthState } from '@/ai/flows/system-health-flow';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';

const StatusIndicator = ({ success }: { success: boolean }) => (
  success ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-destructive" />
);

const StatusBadge = ({ success }: { success: boolean }) => (
    <Badge variant={success ? "default" : "destructive"} className={success ? "bg-green-600" : ""}>
        {success ? "Success" : "Failed"}
    </Badge>
);

export default function SystemHealthDashboard() {
  const [healthState, setHealthState] = useState<SystemHealthState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const isInView = useScrollAnimation(mainRef);

  const handleRunCheck = async () => {
    setLoading(true);
    setError(null);
    setHealthState(null);
    try {
      const result = await runHealthCheck();
      setHealthState(result);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to run health check: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const allServicesSuccess = healthState ? Object.values(healthState).every(service => typeof service === 'object' && service !== null && 'success' in service ? service.success : true) : false;

  return (
    <div ref={mainRef} className={cn("p-4 sm:p-6 lg:p-8 bg-gray-900 text-white min-h-screen scroll-animate", isInView && "in-view")}>
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline">System Health</h1>
            <p className="text-gray-400">Monitor the health and connectivity of Firebase services</p>
        </div>
         <Button onClick={handleRunCheck} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Run Health Check
        </Button>
      </header>

      {loading && (
         <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400"/>
        </div>
      )}

      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive p-4 rounded-md mb-6">
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
        </div>
      )}

      {healthState && (
        <div className="space-y-6 animate-in fade-in-50">
            <div className={`flex items-center gap-2 p-4 rounded-md ${allServicesSuccess ? 'bg-green-900/50 border-green-700' : 'bg-destructive/20 border-destructive'} border`}>
                {allServicesSuccess ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
                <span className="font-semibold">{allServicesSuccess ? 'All Firebase services are working correctly.' : 'One or more Firebase services are reporting issues.'}</span>
                <Badge className={allServicesSuccess ? 'bg-green-500' : 'bg-destructive'}>{allServicesSuccess ? 'SUCCESS' : 'FAILED'}</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Environment Variables */}
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-200">Environment Variables</CardTitle>
                        <CardDescription className="text-gray-400">Status of required server-side variables</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="font-mono text-sm space-y-2">
                            {healthState.envVars.details.map(v => (
                                <li key={v.key} className="flex justify-between items-center">
                                    <span className="text-gray-400">{v.key}:</span>
                                    <span className={v.set ? 'text-green-400' : 'text-yellow-400'}>{v.set ? 'Set' : 'Not Set'}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Service Account */}
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="text-xl text-gray-200">Service Account</CardTitle>
                            <CardDescription className="text-gray-400">Admin SDK credential availability</CardDescription>
                         </div>
                        <StatusIndicator success={healthState.serviceAccount.success} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <span>Status:</span>
                            <StatusBadge success={healthState.serviceAccount.success} />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{healthState.serviceAccount.message}</p>
                    </CardContent>
                </Card>

                {/* Firestore */}
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="text-xl text-gray-200">Firestore Database</CardTitle>
                            <CardDescription className="text-gray-400">Database connectivity and permissions</CardDescription>
                         </div>
                         <StatusIndicator success={healthState.firestore.success} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-2">
                            <span>Status:</span>
                            <StatusBadge success={healthState.firestore.success} />
                        </div>
                         <div className="text-sm space-y-1">
                            <p className="flex justify-between"><span>Can Read:</span> <span className={healthState.firestore.canRead ? 'text-green-400' : 'text-destructive'}>{healthState.firestore.canRead ? 'Yes' : 'No'}</span></p>
                            <p className="flex justify-between"><span>Can Write:</span> <span className={healthState.firestore.canWrite ? 'text-green-400' : 'text-destructive'}>{healthState.firestore.canWrite ? 'Yes' : 'No'}</span></p>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{healthState.firestore.message}</p>
                    </CardContent>
                </Card>

                {/* Authentication */}
                <Card className="bg-gray-800 border-gray-700">
                     <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="text-xl text-gray-200">Firebase Authentication</CardTitle>
                            <CardDescription className="text-gray-400">Authentication service connectivity</CardDescription>
                         </div>
                         <StatusIndicator success={healthState.auth.success} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-2">
                            <span>Status:</span>
                            <StatusBadge success={healthState.auth.success} />
                        </div>
                         <div className="text-sm space-y-1">
                            <p className="flex justify-between"><span>Can List Users:</span> <span className={healthState.auth.canListUsers ? 'text-green-400' : 'text-destructive'}>{healthState.auth.canListUsers ? 'Yes' : 'No'}</span></p>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{healthState.auth.message}</p>
                    </CardContent>
                </Card>

                 {/* Storage */}
                <Card className="bg-gray-800 border-gray-700 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                            <CardTitle className="text-xl text-gray-200">Firebase Storage</CardTitle>
                            <CardDescription className="text-gray-400">File storage connectivity and permissions</CardDescription>
                         </div>
                         <StatusIndicator success={healthState.storage.success} />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-2">
                            <span>Status:</span>
                            <StatusBadge success={healthState.storage.success} />
                        </div>
                         <div className="text-sm space-y-1">
                            <p className="flex justify-between"><span>Bucket Exists:</span> <span className={healthState.storage.bucketExists ? 'text-green-400' : 'text-destructive'}>{healthState.storage.bucketExists ? 'Yes' : 'No'}</span></p>
                             {healthState.storage.bucket && (
                                <p className="flex justify-between font-mono"><span>Bucket:</span> <span className="text-gray-300">{healthState.storage.bucket}</span></p>
                             )}
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{healthState.storage.message}</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-lg text-gray-300">Last Check Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-400">
                    <p>Timestamp: {healthState.timestamp}</p>
                    <p>Overall Status: <span className={allServicesSuccess ? 'text-green-400' : 'text-destructive'}>{allServicesSuccess ? 'Success' : 'Failure'}</span></p>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
