import { htmlSafe } from '@ember/template';

import type { TOC } from '@ember/component/template-only';

interface RectangleSignature {
  Element: HTMLDivElement;
  Args: {
    color: string;
  };
}

function style(color: string) {
  return htmlSafe(
    `width: 400px; height: 200px; border: 2px solid black; background-color: ${color};`,
  );
}

const Rectangle: TOC<RectangleSignature> = <template>
  <div style={{style @color}} ...attributes></div>
</template>;

export default Rectangle;
