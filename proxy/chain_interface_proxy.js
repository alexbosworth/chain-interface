const basicAuth = require('express-basic-auth')
const bodyParser = require('body-parser');
const compress = require('compression')();
const express = require('express');
const {parse} = require('json-bigint');
const {stringify} = require('json-bigint');

const {makeRpcRequest} = require('./../requests');

/** Make a chain interface proxy server

  {
    host: <Bitcoin Core RPC Host String>
    port: <Port Number>
    rpc: <Bitcoin Core RPC Port Number>
  }

  @returns
  {
    server: <Server Object>
  }
*/
module.exports = ({host, port, rpc}) => {
  const app = express();

  const server = app.listen(port, () => {}).on('error', e => {});

  app.disable('x-powered-by');
  app.use(compress);
  app.use(bodyParser.json());
  app.use(basicAuth({authorizer: () => true}));

  app.post('/', async (req, res) => {
    try {
      const result = await makeRpcRequest({
        host,
        cmd: req.body.method,
        id: req.body.id,
        params: req.body.params,
        pass: req.auth.password,
        port: rpc,
        user: req.auth.user,
      });

      // Exit early when method looks for chain info
      if (req.body.method === 'getblockchaininfo') {
        const response = parse(result);

        // Force Taproot to be BIP9
        response.result.softforks.taproot.type = 'bip9';

        const bip8 = response.result.softforks.taproot.bip8;

        if (!!bip8) {
          response.result.softforks.taproot.bip9 = bip8;
        }

        // Eradicate BIP8
        delete response.result.softforks.taproot.bip8;

        return res.send(stringify(response));
      }

      return res.send(result);
    } catch (err) {
      return res.sendStatus(500);
    }
  });

  return {server};
};
