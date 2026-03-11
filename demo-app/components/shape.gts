import type { TOC } from '@ember/component/template-only';

import { variation } from 'ember-launch-darkly';

import Rectangle from './rectangle.gts';
import Square from './square.gts';
import Triangle from './triangle.gts';

interface ShapeSignature {
  Element: HTMLDivElement;
}

function getShape() {
  switch (variation('shape')) {
    case 'rectangle':
      return Rectangle;
    case 'square':
      return Square;
    case 'triangle':
      return Triangle;
  }
}

function color(): string {
  return variation('shape-background-color') ?? '';
}

const Shape: TOC<ShapeSignature> = <template>
  {{#let (getShape) as |ShapeComponent|}}
    {{#if ShapeComponent}}
      <ShapeComponent @color={{(color)}} ...attributes />
    {{/if}}
  {{/let}}
</template>;

export default Shape;
