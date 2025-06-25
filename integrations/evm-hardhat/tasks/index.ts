import { scope } from 'hardhat/config';

/**
 * Defines the scope for earthquake feed-related tasks.
 */
export const priceFeedScope = scope('earthquakefeed', 'Interact with the EarthquakeFeed contract');

// Import tasks after scope is defined to avoid circular dependencies
import './deploy';
import './latest';
import './transmit';
