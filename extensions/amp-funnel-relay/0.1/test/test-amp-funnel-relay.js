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

import '../amp-funnel-relay';

describes.realWin('amp-funnel-relay', {
  amp: {
    extensions: ['amp-funnel-relay'],
  },
}, env => {

  let win;
  let element;

  beforeEach(() => {
    win = env.win;
    element = win.document.createElement('amp-funnel-relay');
    win.document.body.appendChild(element);
    element.setAttribute('src', 'sample_script.js');
  });

  it('should have src attribute', () => {
    element.build();
    expect(element.getAttribute('src')).to.equal('sample_script.js');
  });

  it('should trx.MagicLinks be set on parent window\'s DOM', () => {
    setTimeout(function() {
      expect(win.trx).not.toBe(null);
      expect(win.trx.MagicLinks).not.toBe(null);
    }, 3000);
  });
});
