'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Activity, MapPin, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { getContractInstance, parseEarthquakeData, type EarthquakeData } from '@/lib/contract';
import { clsx } from 'clsx';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';

// Helper to filter out Chainlink probe errors
function isChainlinkProbeError(err: unknown): boolean {
  if (err && typeof err === 'object') {
    const errorObj = err as { code?: string; transaction?: { data?: string }; message?: string };
    if (
      errorObj.code === 'CALL_EXCEPTION' &&
      errorObj.transaction &&
      errorObj.transaction.data === '0x50d25bcd'
    ) {
      return true;
    }
    if (
      errorObj.message &&
      typeof errorObj.message === 'string' &&
      errorObj.message.includes('0x50d25bcd')
    ) {
      return true;
    }
  }
  return false;
}

export default function EarthquakeDashboard() {
  const [earthquakeData, setEarthquakeData] = useState<EarthquakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [formattedTime, setFormattedTime] = useState<string | null>(null);
  const [formattedLastUpdated, setFormattedLastUpdated] = useState<string | null>(null);

  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const fetchEarthquakeData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!publicClient) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Convert wagmi public client to ethers provider
      const provider = new ethers.BrowserProvider(publicClient.transport);
      const contract = getContractInstance(provider);
      
      const result = await contract.latestAnswer();
      
      console.log('Raw result from contract:', result);
      
      if (result && result !== '0x' && result.length > 0) {
        const parsed = parseEarthquakeData(result);
        if (parsed) {
          setEarthquakeData(parsed);
          setLastUpdated(new Date());
        } else {
          setError('Failed to parse earthquake data. Raw data: ' + result.substring(0, 100) + '...');
        }
      } else {
        setError('No earthquake data available. Please request new data using the button below.');
      }
    } catch (err) {
      if (isChainlinkProbeError(err)) {
        // Ignore Chainlink probe errors
        return;
      }
      console.error('Error fetching earthquake data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch earthquake data');
    } finally {
      setLoading(false);
    }
  };

  const requestNewData = async () => {
    try {
      setRequesting(true);
      setError(null);

      if (!walletClient) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Convert wagmi wallet client to ethers provider and signer
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      const contract = getContractInstance(provider);
      const contractWithSigner = contract.connect(signer) as ethers.Contract & {
        transmit: (requestFee: bigint, resultFee: bigint, batchFee: bigint, overrides?: { value: bigint }) => Promise<ethers.ContractTransactionResponse>;
      };

      // Default fees (in wei) - you can adjust these
      const requestFee = ethers.parseEther('0.0001');
      const resultFee = ethers.parseEther('0.0001');
      const batchFee = ethers.parseEther('0.0001');
      const totalValue = requestFee + resultFee + batchFee;

      const tx = await contractWithSigner.transmit(requestFee, resultFee, batchFee, {
        value: totalValue
      });

      await tx.wait();
      
      // Wait a bit for the data to be processed, then fetch new data
      setTimeout(() => {
        fetchEarthquakeData();
      }, 5000);

    } catch (err) {
      if (isChainlinkProbeError(err)) {
        // Ignore Chainlink probe errors
        return;
      }
      console.error('Error requesting new data:', err);
      setError(err instanceof Error ? err.message : 'Failed to request new data');
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchEarthquakeData();
    } else {
      setLoading(false);
      setEarthquakeData(null);
      setError('Please connect your wallet to view earthquake data.');
    }
  }, [isConnected]);

  useEffect(() => {
    if (earthquakeData?.time) {
      setFormattedTime(new Date(earthquakeData.time).toLocaleString());
    } else {
      setFormattedTime(null);
    }
  }, [earthquakeData]);

  useEffect(() => {
    if (lastUpdated) {
      setFormattedLastUpdated(lastUpdated.toLocaleString());
    } else {
      setFormattedLastUpdated(null);
    }
  }, [lastUpdated]);

  const getMagnitudeColor = (magnitude: number) => {
    if (magnitude < 2.0) return 'text-green-600';
    if (magnitude < 4.0) return 'text-yellow-600';
    if (magnitude < 6.0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getMagnitudeSeverity = (magnitude: number) => {
    if (magnitude < 2.0) return 'Micro';
    if (magnitude < 3.0) return 'Minor';
    if (magnitude < 4.0) return 'Light';
    if (magnitude < 5.0) return 'Moderate';
    if (magnitude < 6.0) return 'Strong';
    if (magnitude < 7.0) return 'Major';
    return 'Great';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] via-[#0A0A0F] to-[#1a1a2e] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div> {/* Spacer */}
            <ConnectWallet />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            🌍 SEDA Earthquake Oracle
          </h1>
          <p className="text-gray-300">
            Real-time earthquake data from the USGS via SEDA Network
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Earthquake Data */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Latest Earthquake</h2>
              <button
                onClick={fetchEarthquakeData}
                disabled={loading || !isConnected}
                className="flex items-center px-3 py-1 text-sm bg-[#6100FF]/20 text-[#6100FF] rounded-md hover:bg-[#7E2FFF]/20 disabled:opacity-50 border border-[#6100FF]/30"
              >
                <Activity className="h-4 w-4 mr-1" />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6100FF]"></div>
              </div>
            ) : earthquakeData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-sm text-gray-300">Magnitude</span>
                  </div>
                  <div className="text-right">
                    <span className={clsx('text-2xl font-bold', getMagnitudeColor(earthquakeData.magnitude))}>
                      {earthquakeData.magnitude}
                    </span>
                    <span className="text-sm text-gray-400 ml-2">
                      ({getMagnitudeSeverity(earthquakeData.magnitude)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm text-gray-300">Location</span>
                  </div>
                  <span className="text-sm font-medium text-white text-right">
                    {earthquakeData.location}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm text-gray-300">Time</span>
                  </div>
                  <span className="text-sm text-white text-right">
                    {formattedTime}
                  </span>
                </div>

                {lastUpdated && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center text-xs text-gray-400">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Last updated: {formattedLastUpdated}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                {isConnected ? 'No earthquake data available' : 'Connect your wallet to view data'}
              </div>
            )}
          </div>

          {/* Request New Data */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Request New Data</h2>
            <p className="text-gray-300 mb-6">
              Trigger a new data request to fetch the latest earthquake information from the USGS API.
            </p>

            <button
              onClick={requestNewData}
              disabled={requesting || loading || !isConnected}
              className="w-full bg-[#6100FF] text-white py-3 px-4 rounded-lg hover:bg-[#7E2FFF] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {requesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Requesting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {isConnected ? 'Request New Earthquake Data' : 'Connect Wallet to Request Data'}
                </>
              )}
            </button>

            <div className="mt-4 p-4 bg-[#6100FF]/10 rounded-lg border border-[#6100FF]/20">
              <h3 className="font-medium text-[#6100FF] mb-2">How it works:</h3>
              <ol className="text-sm text-gray-300 space-y-1">
                <li>1. Connect your wallet using the button above</li>
                <li>2. Click the button to request new data</li>
                <li>3. Your request is sent to the SEDA Network</li>
                <li>4. Oracle nodes fetch data from USGS API</li>
                <li>5. Consensus is reached and data is stored on-chain</li>
                <li>6. Refresh to see the latest earthquake data</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Contract Info */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Contract Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-300">Contract Address:</span>
              <div className="font-mono text-white break-all">
                {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}
              </div>
            </div>
            <div>
              <span className="text-gray-300">Oracle Program ID:</span>
              <div className="font-mono text-white break-all">
                {process.env.NEXT_PUBLIC_ORACLE_PROGRAM_ID}
              </div>
            </div>
            <div>
              <span className="text-gray-300">Network:</span>
              <div className="text-white">Base Sepolia Testnet</div>
            </div>
            <div>
              <span className="text-gray-300">Data Source:</span>
              <div className="text-white">USGS Earthquake API</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 