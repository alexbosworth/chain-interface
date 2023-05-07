const {getPortPromise} = require('portfinder');
const {spawnBitcoindDocker} = require('ln-docker-daemons');
const {spawnLndDocker} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {chainInterfaceProxy} = require('./../../proxy');
const {generateToAddress} = require('./../../bitcoind');

const afterPort = port => port + 1;
const generateAddress = '2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF';
const getPort = ({port}) => getPortPromise({port});
const hostForBitcoind = 'localhost';
const hostForDockerExternalDns = 'host.docker.internal';

// Starting the proxy should proxy traffic from Bitcoin Core
test(`Proxy traffic`, async ({end}) => {
  const portP2pBitcoind = await getPort({});

  const portRpcBitcoind = await getPort({port: afterPort(portP2pBitcoind)});

  // Spin up a Bitcoin Core node
  const spawnBitcoind = await spawnBitcoindDocker({
    p2p_port: portP2pBitcoind,
    rpc_port: portRpcBitcoind,
  });

  const portRpcProxy = await getPort({port: afterPort(portRpcBitcoind)});

  // Start the proxy service
  const {server} = chainInterfaceProxy({
    host: hostForBitcoind,
    port: portRpcProxy,
    rpc: portRpcBitcoind,
  });

  // Mine a block so LND will start
  await generateToAddress({
    address: generateAddress,
    pass: spawnBitcoind.rpc_pass,
    port: portRpcProxy,
    user: spawnBitcoind.rpc_user,
  });

  const portP2pLnd = await getPort({port: afterPort(portRpcProxy)});

  const portRpcLnd = await getPort({port: afterPort(portP2pLnd)});

  const portTowerLnd = await getPort({port: afterPort(portRpcLnd)});

  // Spin up a LND node
  const spawnLnd = await spawnLndDocker({
    bitcoind_rpc_host: hostForDockerExternalDns,
    bitcoind_rpc_pass: spawnBitcoind.rpc_pass,
    bitcoind_rpc_port: portRpcProxy,
    bitcoind_rpc_user: spawnBitcoind.rpc_user,
    p2p_port: portP2pLnd,
    rpc_port: portRpcLnd,
    tower_port: portTowerLnd,
  });

  server.close();

  await spawnBitcoind.kill({});
  await spawnLnd.kill({});

  return end();
});
