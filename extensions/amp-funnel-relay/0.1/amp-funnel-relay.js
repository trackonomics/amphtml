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

import {FunnelRelay} from './funnel_relay';
import {LOCAL_ENV, PROD_ENV, TEST_ENV} from './constants';
import {Layout} from '../../../src/layout';
import {Services} from '../../../src/services';

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
    this.ampDoc_ = this.getAmpDoc();
    this.envSettings_ = this.getEnvSettings();
    return this.ampDoc_.whenBodyAvailable().then(() => {
      const envCode = this.element.getAttribute('env_code');
      if (envCode == null || envCode.length === 0) {
        console.log('amp-funnel-relay -' +
            ' Mandatory attribute \'env_code\' is missing! Operation ignored.');
        return;
      }

      this.loadSettings_().then(settings => {
        new FunnelRelay(settings, this.win, this.ampDoc_);
      });
    });
  }

  /** @override */
  preconnectCallback() {
    //render funnel-relay script
    /*const scriptEm = document.createElement('script');
    scriptEm.src = this.element.getAttribute('src');
    scriptEm.id = 'funnel-relay-installer';
    scriptEm.setAttribute('async', '');
    document.body.appendChild(scriptEm);*/
  }

  /**
   * Load  funnel-relay settings
   * @return {*}
   * @private
   */
  loadSettings_() {
    const options = {
      method: 'GET',
      ampCors: false,
    };
    const settingsUrl = this.envSettings_.SETTINGS_ENDPOINT.replace(
        '{name}', this.getSettingsName(),
    );
    const xhr = Services.xhrFor(this.win);
    return xhr.fetchJson(settingsUrl, options).then(resp => {
      return resp.json(); // Transform the data into json
    });
  }

  /**
   * Get the environment settings according to attribute "env" set by user.
   * @return {{}} settings object
   */
  getEnvSettings() {
    switch (this.element.getAttribute('env')) {
      case 'local':
        return LOCAL_ENV;
      case 'test':
        return TEST_ENV;
      default:
        return PROD_ENV;
    }
  }

  /**
   * Get profile code that involve two attributes:
   * 1. env_code
   * 2. profile
   */
  getSettingsName() {
    let name = this.element.getAttribute('env_code');
    const profile = this.element.getAttribute('profile');
    if (profile != null && profile.length > 0) {
      name += '_' + profile;
    }
    return name;
  }
}

AMP.extension('amp-funnel-relay', '0.1', AMP => {
  AMP.registerElement('amp-funnel-relay', AmpFunnelRelay);
});
