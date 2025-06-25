import { priceFeedScope } from '.';
import { getDeployedContract } from './utils';

/**
 * Task: Fetches the latest answer from the EarthquakeFeed contract.
 * Optional parameter: contract (EarthquakeFeed contract address).
 * If the contract address is not provided, fetches from previous deployments.
 */
priceFeedScope
  .task('latest', 'Calls the latestAnswer function on the EarthquakeFeed contract')
  .addOptionalParam('contract', 'The EarthquakeFeed contract address')
  .setAction(async ({ contract }, hre) => {
    try {
      // Fetch the address from previous deployments if not provided
      let earthquakeFeedAddress = contract;
      if (!earthquakeFeedAddress) {
        console.log('No contract address specified, fetching from previous deployments...');
        earthquakeFeedAddress = getDeployedContract(hre.network, 'EarthquakeFeed');
        console.log('Contract found:', earthquakeFeedAddress);
      }

      // Get the EarthquakeFeed contract instance
      const earthquakeFeed = await hre.ethers.getContractAt('EarthquakeFeed', earthquakeFeedAddress);

      // Call the latestAnswer function on the contract
      console.log(`\nCalling latestAnswer() on EarthquakeFeed at ${earthquakeFeedAddress}`);
      const latestAnswer = await earthquakeFeed.latestAnswer();
      console.log('Latest Answer:', latestAnswer.toString());
      // biome-ignore lint/suspicious/noExplicitAny:
    } catch (error: any) {
      console.error(`An error occurred while fetching the latest answer: ${error.message}`);
    }
  });
