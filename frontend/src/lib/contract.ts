import { ethers } from 'ethers';

// EarthquakeFeed Contract ABI (minimal version for our needs)
export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_sedaCoreAddress",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "_oracleProgramId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ORACLE_PROGRAM_ID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SEDA_CORE",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "latestAnswer",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "requestFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "resultFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "batchFee",
        "type": "uint256"
      }
    ],
    "name": "transmit",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
export const ORACLE_PROGRAM_ID = process.env.NEXT_PUBLIC_ORACLE_PROGRAM_ID!;

export interface EarthquakeData {
  magnitude: number;
  location: string;
  time: number;
}

export function parseEarthquakeData(data: string): EarthquakeData | null {
  try {
    // Remove 0x prefix if present
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    const jsonString = Buffer.from(cleanData, 'hex').toString('utf-8');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse earthquake data:', error);
    return null;
  }
}

export function getContractInstance(provider: ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
} 