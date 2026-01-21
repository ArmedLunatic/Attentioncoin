import { Connection } from '@solana/web3.js';

let _connection: Connection;
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  }
  return _connection;
}
