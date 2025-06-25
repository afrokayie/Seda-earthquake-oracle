import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import MockSedaCore from '@seda-protocol/evm/artifacts/contracts/mocks/MockSedaCore.sol/MockSedaCore.json';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('EarthquakeFeed Contract', () => {
  // Setup the fixture to deploy contracts
  async function deployEarthquakeFeedFixture() {
    const [admin] = await ethers.getSigners();

    // A Data Request WASM binary ID (mock value)
    const oracleProgramId = ethers.ZeroHash;

    // Deploy MockSedaCore
    const SedaCore = await ethers.getContractFactoryFromArtifact(MockSedaCore);

    // Deploy without constructor arguments as the mock doesn't have the expected constructor
    const core = await SedaCore.deploy();

    // Deploy the EarthquakeFeed contract
    const EarthquakeFeed = await ethers.getContractFactory('EarthquakeFeed');
    const earthquakeFeed = await EarthquakeFeed.deploy(core.getAddress(), oracleProgramId);

    return { earthquakeFeed, core, admin };
  }

  /**
   * Test Case 1: Successful deployment
   * Verify that the contract deploys successfully with the correct constructor parameters.
   */
  it('Should deploy successfully with correct constructor parameters', async () => {
    const { earthquakeFeed, core } = await loadFixture(deployEarthquakeFeedFixture);

    // Check that the contract was deployed with the correct SEDA Core address
    expect(await earthquakeFeed.SEDA_CORE()).to.equal(await core.getAddress());

    // Check that the Oracle Program ID is set correctly
    expect(await earthquakeFeed.ORACLE_PROGRAM_ID()).to.equal(ethers.ZeroHash);

    // Check that the initial request ID is zero
    expect(await earthquakeFeed.requestId()).to.equal(ethers.ZeroHash);
  });

  /**
   * Test Case 2: Revert when calling latestAnswer before any request
   * Ensure that latestAnswer reverts when no request has been transmitted.
   */
  it('Should revert when calling latestAnswer before any request is transmitted', async () => {
    const { earthquakeFeed } = await loadFixture(deployEarthquakeFeedFixture);

    // latestAnswer should revert with RequestNotTransmitted error
    await expect(earthquakeFeed.latestAnswer()).to.be.revertedWithCustomError(
      earthquakeFeed,
      'RequestNotTransmitted'
    );
  });

  /**
   * Test Case 3: Return correct `latestAnswer` with consensus (true)
   * Verify that latestAnswer returns the correct value when consensus is reached.
   */
  it('Should return the correct latest answer if consensus is reached', async () => {
    const { earthquakeFeed, core } = await loadFixture(deployEarthquakeFeedFixture);

    // Transmit a data request
    await earthquakeFeed.transmit(0, 0, 0);
    const dataRequestId = await earthquakeFeed.requestId();

    // Set a data result with consensus in the contract
    const resultValue = '0x7b226d61676e6974756465223a352e352c226c6f636174696f6e223a2254657374222c2274696d65223a313730303030303030303030307d'; // Mock JSON value
    const result = {
      version: '0.0.1',
      drId: dataRequestId,
      consensus: true,
      exitCode: 0,
      result: resultValue,
      blockHeight: 0,
      blockTimestamp: Math.floor(Date.now() / 1000) + 3600,
      gasUsed: 0,
      paybackAddress: ethers.ZeroAddress,
      sedaPayload: ethers.ZeroHash,
    };
    await core.postResult(result, 0, []);

    // latestAnswer should return the expected result when consensus is reached
    const latestAnswer = await earthquakeFeed.latestAnswer();
    expect(latestAnswer).to.equal(resultValue);
  });

  /**
   * Test Case 4: Return empty bytes if no consensus reached
   * Ensure that latestAnswer returns empty bytes when no consensus is reached.
   */
  it('Should return empty bytes if consensus is not reached', async () => {
    const { earthquakeFeed, core } = await loadFixture(deployEarthquakeFeedFixture);

    // Transmit a data request
    await earthquakeFeed.transmit(0, 0, 0);
    const dataRequestId = await earthquakeFeed.requestId();

    // Set a data result without consensus (false)
    const resultValue = '0x7b226d61676e6974756465223a352e352c226c6f636174696f6e223a2254657374222c2274696d65223a313730303030303030303030307d'; // Mock JSON value
    const result = {
      version: '0.0.1',
      drId: dataRequestId,
      consensus: false,
      exitCode: 0,
      result: resultValue,
      blockHeight: 0,
      blockTimestamp: Math.floor(Date.now() / 1000) + 3600,
      gasUsed: 0,
      paybackAddress: ethers.ZeroAddress,
      sedaPayload: ethers.ZeroHash,
    };
    await core.postResult(result, 0, []);

    // latestAnswer should return empty bytes since no consensus was reached
    const latestAnswer = await earthquakeFeed.latestAnswer();
    expect(latestAnswer).to.equal('');
  });

  /**
   * Test Case 5: Successful transmission
   * Ensure that a data request is correctly transmitted and the request ID is valid.
   */
  it('Should successfully transmit a data request and return a valid request ID', async () => {
    const { earthquakeFeed } = await loadFixture(deployEarthquakeFeedFixture);

    // Assert data request id is zero
    let dataRequestId = await earthquakeFeed.requestId();
    expect(dataRequestId).to.be.equal(ethers.ZeroHash);

    // Call the transmit function
    await earthquakeFeed.transmit(0, 0, 0);

    // Check that the data request ID is valid and stored correctly
    dataRequestId = await earthquakeFeed.requestId();
    expect(dataRequestId).to.not.be.equal(ethers.ZeroHash);
  });
});
