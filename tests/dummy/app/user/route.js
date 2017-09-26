import Route from 'ember-route';
import service from 'ember-service/inject';

export default Route.extend({
  launchDarkly: service(),

  model() {
    return {
      key: '1',
      anonymous: false,
      email: 'dave@foos.com',
      custom: {
        fullName: 'Dave Grohl'
      }
    };
  },

  afterModel(user) {
    return this.get('launchDarkly').identify(user);
  }
});
