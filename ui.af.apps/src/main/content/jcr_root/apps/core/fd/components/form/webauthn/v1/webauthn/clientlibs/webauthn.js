/*******************************************************************************
 * Copyright 2022 Adobe
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ******************************************************************************/

(function () {

    const fidoServerUrl = "http://localhost:8000";
    const { startAuthentication, browserSupportsWebAuthn, startRegistration } = SimpleWebAuthnBrowser;

    class WebAuthn {

        static NS = FormView.Constants.NS;
        static IS = "adaptiveFormWebAuthn";
        static bemBlock = "cmp-webauthn";

        static selectors = {
            self: "[data-" + this.NS + '-is="' + this.IS + '"]',
            register: ".cmp-webauthn__register",
            authenticate: ".cmp-webauthn__authenticate",
            prefill: ".cmp-webauthn__prefill"
        };

        constructor(params) {
            console.log("====== init WebAuthn", params);
            //this.#attachRegistrationEventListener();
            //this.#attachAuthenticationEventListener();
            //this.#attachPrefillEventListener();
            this.#webAuthnRegister();
        }

        #webAuthnRegister(){
            const registerButton = document.querySelector(WebAuthn.selectors.register);
            registerButton.addEventListener("click", async () => {
                const res = await fetch('/adobe/forms/webauthn/startRegistration');
                const resJson = await res.json();
                const options = JSON.parse(resJson.credential).publicKey;
              
                //delete options.excludeCredentials;
                delete options.extensions;
               
                options.challenge = base64url.decode(options.challenge);
                options.user.id = base64url.decode(options.user.id);
                const cred = await navigator.credentials.create({
                    publicKey: options
                });
                
                const credential = {};

                credential.id = cred.id;
                credential.rawId = base64url.encode(cred.rawId);
                credential.type = cred.type;

                if (cred.response) {
                    const clientDataJSON =
                        base64url.encode(cred.response.clientDataJSON);
                    const attestationObject =
                        base64url.encode(cred.response.attestationObject);
                    credential.response = {
                        clientDataJSON,
                        attestationObject
                    };
                }
                const x = await fetch('/adobe/forms/webauthn/finishRegistration' , {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({publicKeyCredential: credential, id: resJson.id})
                });

            });
        }

        #attachRegistrationEventListener() {
            const registerButton = document.querySelector(WebAuthn.selectors.register);
            registerButton.addEventListener("click", async () => {

                const resp = await fetch(fidoServerUrl + '/generate-registration-options');

                let attResp;
                try {
                    const opts = await resp.json();

                    // Require a resident key for this demo
                    opts.authenticatorSelection.residentKey = 'required';
                    opts.authenticatorSelection.requireResidentKey = true;
                    opts.extensions = {
                        credProps: true,
                    };

                    console.log('Registration Options', JSON.stringify(opts, null, 2));
                    
                    //TODO
                    //hideAuthForm();

                    attResp = await startRegistration(opts);
                    console.log('Registration Response', JSON.stringify(attResp, null, 2));
                } catch (error) {
                    if (error.name === 'InvalidStateError') {
                        console.log('Error: Authenticator was probably already registered by user');
                    } else {
                        console.log(error);
                    }
                    throw error;
                }

                const verificationResp = await fetch(fidoServerUrl+'/verify-registration', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(attResp),
                });

                const verificationJSON = await verificationResp.json();
                console.log('Server Response', JSON.stringify(verificationJSON, null, 2));

                if (verificationJSON && verificationJSON.verified) {
                    console.log(`Authenticator registered!`);
                } else {
                    console.log(`Oh no, something went wrong! Response: <pre>${JSON.stringify(
                        verificationJSON,
                    )}</pre>`);
                }
            }
            );
        }

        #attachAuthenticationEventListener() {
            const authenticateButton = document.querySelector(WebAuthn.selectors.authenticate);
            authenticateButton.addEventListener('click', async () => {
      
                const resp = await fetch(fidoServerUrl+'/generate-authentication-options');
      
                let asseResp;
                try {
                  const opts = await resp.json();
                  console.log('Authentication Options', JSON.stringify(opts, null, 2));
      
                  asseResp = await startAuthentication(opts);
                  console.log('Authentication Response', JSON.stringify(asseResp, null, 2));
                } catch (error) {
                  throw new Error(error);
                }
      
                const verificationResp = await fetch(fidoServerUrl+'/verify-authentication', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(asseResp),
                });
      
                const verificationJSON = await verificationResp.json();
                console.log('Server Response', JSON.stringify(verificationJSON, null, 2));
      
                if (verificationJSON && verificationJSON.verified) {
                  console.log(`User authenticated!`);
                } else {
                  console.log(`Oh no, something went wrong! Response: <pre>${JSON.stringify(
                    verificationJSON,
                  )}</pre>`);
                }
              });
        }
        
        #attachPrefillEventListener() {
            const authenticateButton = document.querySelector(WebAuthn.selectors.prefill);
            authenticateButton.addEventListener('click', async () => {
      
                const resp = await fetch(fidoServerUrl+'/generate-authentication-options');
      
                let asseResp;
                try {
                  const opts = await resp.json();
                  console.log('Authentication Options', JSON.stringify(opts, null, 2));
      
                  asseResp = await startAuthentication(opts);
                  console.log('Authentication Response', JSON.stringify(asseResp, null, 2));
                } catch (error) {
                  throw new Error(error);
                }
      
                const verificationResp = await fetch(fidoServerUrl+'/verify-authentication', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(asseResp),
                });
      
                const verificationJSON = await verificationResp.json();
                console.log('Server Response', JSON.stringify(verificationJSON, null, 2));
      
                if (verificationJSON && verificationJSON.verified) {
                  console.log(`User authenticated!`);
                } else {
                  console.log(`Oh no, something went wrong! Response: <pre>${JSON.stringify(
                    verificationJSON,
                  )}</pre>`);
                }
              });
        }

    }

    FormView.Utils.setupField(({ element, formContainer }) => {
        return new WebAuthn({ element, formContainer })
    }, WebAuthn.selectors.self);

}());
