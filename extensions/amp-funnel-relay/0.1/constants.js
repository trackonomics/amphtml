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

/* URL of local environment */
const BASE_API_URL_LOCAL = 'https://localmagiclinks.trackonomics.net';
/** @const @enum {string} */
export const LOCAL_ENV = {
  SETTINGS_ENDPOINT:
      `${BASE_API_URL_LOCAL}/client/static/{name}_settings.json`,
};

/* URL of test environment */
const BASE_API_URL_TEST = 'https://magiclinks2.trackonomics.net';
/** @const @enum {string} */
export const TEST_ENV = {
  SETTINGS_ENDPOINT:
      `${BASE_API_URL_TEST}/client/static/{name}_settings.json`,
};

/* URL of prod environment */
const BASE_API_URL_PROD = 'https://magiclinks.trackonomics.net';
export const PROD_ENV = {
  SETTINGS_ENDPOINT:
      `${BASE_API_URL_PROD}/client/static/{name}_settings.json`,
};
