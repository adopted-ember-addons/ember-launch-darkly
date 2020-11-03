import * as LDClient from 'launchdarkly-js-client-sdk';
import * as common from 'launchdarkly-js-sdk-common';

async function initialize(
  clientSideId,
  user = {},
  options = {},
  ldClient = LDClient
) {
  let client = ldClient.initialize(clientSideId, user, options);

  try {
    await client.waitForInitialization();
  } catch (e) {
    debugger;
  }

  return true;
}

export { initialize };
