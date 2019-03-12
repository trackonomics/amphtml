/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Layout} from '../../../src/layout';
import {isExperimentOn} from '../../../src/experiments';
import {userAssert} from '../../../src/log';

/** @const */
const EXPERIMENT = 'amp-funnel-relay';

/** @const */
const TAG = 'amp-funnel-relay';

export class AmpFunnelRelay extends AMP.BaseElement {

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    // Declare instance variables with type annotations.
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout === Layout.NODISPLAY;
  }

  /** @override */
  buildCallback() {
    //We want the tag to work without user's need to turn it on.
    //userAssert(isExperimentOn(this.win, 'amp-funnel-relay'),
    //    `Experiment ${EXPERIMENT} is not turned on.`);
    // Get attributes, assertions of values, assign instance variables.
    // Build lightweight DOM and append to this.element.
  }

  /** @override */
  preconnectCallback() {
    //render funnel-relay script
    const scriptEm = document.createElement('script');
    scriptEm.src = this.element.getAttribute('src');
    scriptEm.id = 'funnel-relay-installer';
    document.body.appendChild(scriptEm);
  }
}

AMP.extension('amp-funnel-relay', '0.1', AMP => {
  AMP.registerElement('amp-funnel-relay', AmpFunnelRelay);
});
