import { variation } from 'ember-launch-darkly';

import Shape from '../components/shape.gts';

<template>
  <br />
  <br />

  <Shape class={{if (variation "make-shape-blink") "blink"}} />
</template>
