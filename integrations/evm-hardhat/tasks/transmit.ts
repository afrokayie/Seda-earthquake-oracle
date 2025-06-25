import { priceFeedScope } from '.';
import { getDeployedContract } from './utils';

// Default fees in ETH
const DEFAULT_FEE = '0.0001';

/**
 * Task: Calls the transmit function on the EarthquakeFeed contract.
 * Optional parameters:
 * - contract: EarthquakeFeed contract address
 * - requestFee: Fee for data request (in ETH)
 * - resultFee: Fee for result processing (in ETH)
 * - batchFee: Fee for batch operations (in ETH)
 *
 * If parameters are not provided, default values are used.
 */
priceFeedScope
  .task('transmit', 'Calls the transmit function on the EarthquakeFeed contract')
  .addOptionalParam('contract', 'The EarthquakeFeed contract address')
  .addOptionalParam('requestFee', 'Fee for data request (in ETH)', DEFAULT_FEE)
  .addOptionalParam('resultFee', 'Fee for result processing (in ETH)', DEFAULT_FEE)
  .addOptionalParam('batchFee', 'Fee for batch operations (in ETH)', DEFAULT_FEE)
  .setAction(async ({ contract, requestFee, resultFee, batchFee }, hre) => {
    try {
      // Fetch the address from previous deployments if not provided
      let earthquakeFeedAddress = contract;
      if (!earthquakeFeedAddress) {
        console.log('No contract address specified, fetching from previous deployments...');
        earthquakeFeedAddress = getDeployedContract(hre.network, 'EarthquakeFeed');
        console.log('Contract found:', earthquakeFeedAddress);
      }

      // Parse the fee values
      const parsedRequestFee = hre.ethers.parseEther(requestFee);
      const parsedResultFee = hre.ethers.parseEther(resultFee);
      const parsedBatchFee = hre.ethers.parseEther(batchFee);

      // Calculate total value for the transaction
      const totalValue = parsedRequestFee + parsedResultFee + parsedBatchFee;

      // Get the EarthquakeFeed contract instance
      const earthquakeFeed = await hre.ethers.getContractAt('EarthquakeFeed', earthquakeFeedAddress);

      // Call the transmit function
      console.log(`\nCalling transmit() on EarthquakeFeed at ${earthquakeFeedAddress}...\n`);
      console.log(`Fees (ETH):
- Request Fee: ${requestFee}
- Result Fee: ${resultFee}
- Batch Fee: ${batchFee}
- Total: ${hre.ethers.formatEther(totalValue)}\n`);

      const tx = await earthquakeFeed.transmit(parsedRequestFee, parsedResultFee, parsedBatchFee, { value: totalValue });

      // Wait for the transaction
      await tx.wait();
      console.log('Transmit executed successfully.');
    } catch (error) {
      console.error('An error occurred during the transmit function:', error);
    }
  });
