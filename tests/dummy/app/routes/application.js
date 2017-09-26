import Route from 'ember-route';
import service from 'ember-service/inject';

export default Route.extend({
  launchDarkly: service(),

  beforeModel() {
    const user = {
      key: 'aa0ceb',
      anonymous: true
    };

    return this.get('launchDarkly').initialize(user);
  }
});
