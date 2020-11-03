import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class CheeseRoute extends Route {
  @service candy;

  async beforeModel() {
    await this.candy.initialize();
  }
}
