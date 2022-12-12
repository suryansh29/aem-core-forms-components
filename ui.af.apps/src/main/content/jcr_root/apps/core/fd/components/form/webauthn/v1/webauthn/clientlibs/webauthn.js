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

(function (guideBridge) {

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
            console.log("====== init WebAuthn ======", params);
            this.#webAuthnRegister();
            this.#webAuthnAuthenticator()
        }

        #webAuthnRegister() {
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
                credential.clientExtensionResults = {
                    credProps: {
                        rk: true
                    }
                };

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

        #webAuthnAuthenticator() {
            const authenticateButton = document.querySelector(WebAuthn.selectors.prefill);
            authenticateButton.addEventListener("click", async () => {
                const res = await fetch('/adobe/forms/webauthn/startAuthentication');
                const resJson = await res.json();
                const options = JSON.parse(resJson.credential).publicKey;
                options.allowCredentials = [];

                options.challenge = base64url.decode(options.challenge);
                const cred  = await navigator.credentials.get({
                    publicKey: options,
                });

                const credential = {};
                credential.id = cred.id;
                credential.type = cred.type;
                credential.rawId = base64url.encode(cred.rawId);
                credential.clientExtensionResults = {
                    credProps: {
                        rk: true
                    }
                };

                if (cred.response) {
                    const clientDataJSON =
                        base64url.encode(cred.response.clientDataJSON);
                    const authenticatorData =
                        base64url.encode(cred.response.authenticatorData);
                    const signature =
                        base64url.encode(cred.response.signature);
                    const userHandle =
                        base64url.encode(cred.response.userHandle);
                    credential.response = {
                        clientDataJSON,
                        authenticatorData,
                        signature,
                        userHandle,
                    };
                }

                const resp = await fetch('/adobe/forms/webauthn/finishAuthentication' , {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({publicKeyCredential: credential, id: resJson.id})
                });
                const data = await resp.json();
                if(typeof data === "object") {
                    guideBridge.getFormModel().importData(data);
                }
                console.log(data);

            })
        }
    }

    FormView.Utils.setupField(({ element, formContainer }) => {
        return new WebAuthn({ element, formContainer })
    }, WebAuthn.selectors.self);

}(guideBridge));
