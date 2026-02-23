import { htmlSafe } from '@ember/template';

import type { TOC } from '@ember/component/template-only';

interface TriangleSignature {
  Element: HTMLDivElement;
  Args: {
    color: string;
  };
}

function innerStyle(color: string) {
  return htmlSafe(
    `border-color: ${color} transparent; border-style: solid; border-width: 0px 120px 207.84px 120px; height: 0px; width: 0px; position: absolute; left: -120px; top: 5px;`,
  );
}

const Triangle: TOC<TriangleSignature> = <template>
  <div
    {{! template-lint-disable no-inline-styles }}
    style="border-color: black transparent; border-style: solid; border-width: 0px 125px 216.5px 125px; height: 0px; width: 0px; position: relative;"
    ...attributes
  >
    <div style={{innerStyle @color}}></div>
  </div>
</template>;

export default Triangle;
