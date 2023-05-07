const config = require('dotenv').config();

const {chainInterfaceProxy} = require('./proxy');

(async () => {
  // Start the proxy service
  const {server} = chainInterfaceProxy({
    host: process.env.CHAIN_INTERFACE_BACKEND_HOST,
    port: process.env.CHAIN_INTERFACE_PORT,
    rpc: process.env.CHAIN_INTERFACE_BACKEND_PORT,
  });
})();
