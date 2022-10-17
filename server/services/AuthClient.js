/**
 * AuthClient.js provides a class offering features for Microsoft Graph and SAP BTP authentication
 * 
 * This class provides helpfull features required for authenticating Microsoft Graph and SAP BTP requests.
 * Requests to Microsoft Graph are either authenticated via delegate permissions or application permissions.
 * Requests to SAP BTP are authenticated using a SAML assertion obtained from Azure AD (see details below). 
 *   
 */

import querystring from 'querystring'
import qs from 'qs'
import axios from 'axios'

class AuthClient {
    constructor(){
        // The AuthClient needs various environment variables
        this._btpLandscape = process.env.BTP_LANDSCAPE;
        this._btpAccountName = process.env.BTP_ACCOUNT_NAME;
        this._xsuaaACSURLSuffix = process.env.XSUAA_CS_URL_SUFFIX;

        // Azure Active Directory tenant id
        this.aadTenantId = process.env.MICROSOFT_AD_TENANT_ID;

        // Application registration id and secret
        this.appId = process.env.MICROSOFT_APP_ID;
        this.appSecret = process.env.MICROSOFT_APP_PASSWORD;

        // Client Id and secret of xsuaa instance
        const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
        const xsuaaCredentials = VCAP_SERVICES.xsuaa[0].credentials;
        this.xsuaaClientId = xsuaaCredentials.clientid;
        this.xsuaaSecret = xsuaaCredentials.clientsecret;

        const destCredentials = VCAP_SERVICES.destination[0].credentials;
        this.destXsuaaClientId = destCredentials.clientid;
        this.destXsuaaSecret = destCredentials.clientsecret;

        // V2 AAD path for On-behalf-of flow
        this.pathOAuth = `/${this.aadTenantId}/oauth2/token`;
        // JWT-Bearer token grant type
        this.grantTypeJwtBearer = "urn:ietf:params:oauth:grant-type:jwt-bearer";
        // On behalf of token use
        this.tokenUseValue = "on_behalf_of";
        // Token type SAML2
        this.tokenTypeSaml = "urn:ietf:params:oauth:token-type:saml2";
        // Token type SAML bearer
        this.grantTypeSaml = "urn:ietf:params:oauth:grant-type:saml2-bearer";
        // XSUAA hostname
        this.xsuaaUrl = `https://${this._btpAccountName}.authentication.${this._btpLandscape}.hana.ondemand.com`;
        // AAD hostname
        this.aadBasUrl = "https://login.microsoftonline.com";
        // XSUAA token endpoint URL including the Assertion Consumer Service url suffix
        this.btpTokenEndpoint = `/oauth/token/alias/${this._btpAccountName}.${this._xsuaaACSURLSuffix}`;
        // Custom scope for BTP SAML assertion process
        this.btpScopes = process.env.BTP_SCOPES;

        this.headerUrlEncoded = "application/x-www-form-urlencoded";
    }

    /**
     * This method allows to request an OAuth token for Microsoft Graph access using the on-behalf-of flow 
     * 
     * It allows us to obtain an applicaton access token on-behalf-of the current user using the current
     * Microsoft Teams session token which is passed in via the req parameter. As Microsoft Teams has been added as a 
     * trusted client to the app registration, a valid OAuth token for Microsoft Graph access can be obtained. 
     * 
     * Find more information concerning the on-behalf-of flow in the Microsoft documentation:
     * https://docs.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/auth-aad-sso
     */
    async getAccessTokenForGraphAccess (req){
        return new Promise((resolve, reject) => {
            const token = this._getAuthDataFromRequest(req);
            const scopes = ['User.Read', 'email', 'offline_access', 'openid', 'profile', 'User.ReadBasic.All'];
            const url = `https://login.microsoftonline.com/${ this.aadTenantId }/oauth2/v2.0/token`;
            const params = {
                client_id: this.appId,
                client_secret: this.appSecret,
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: token,
                requested_token_use: 'on_behalf_of',
                scope: scopes.join(' ')
            };
            // eslint-disable-next-line no-undef
            fetch(url, {
                method: 'POST',
                body: querystring.stringify(params),
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(result => {
                if (result.status !== 200) {
                    result.json().then(json => {
                        // eslint-disable-next-line prefer-promise-reject-errors
                        reject({ error: json.error });
                    });
                } else {
                    result.json().then(async json => {
                        resolve(json.access_token);
                    });
                }
            });
        });
    }

    
    /**
     * This method allows to request an OAuth token for Microsoft Graph access using application permissions
     * 
     * It allows us to obtain an applicaton access token with application permissions. Therefor no 
     * user context or Microsoft Teams session context is required but the resulting OAuth token contains the 
     * Microsoft Graph permissions granted on appliation level. This is required for scenarios in which a user
     * context is not available e.g. when a notification arrives and the Azure Id of the receiver and
     * sender need to be read from Microsoft Graph by the application before sending out the notification.
     * Whereas delegate permissions should be preferred wherever possible, in this case no alternative
     * approach can be used.  
     * 
     */
    async getAccessTokenForApplication (){
        const data = qs.stringify({
            'grant_type': 'client_credentials',
            'scope': 'https://graph.microsoft.com/.default',
            'client_id': this.appId,
            'client_secret': this.appSecret
        });

        return new Promise(async (resolve, reject) => {
            await axios.post('https://login.microsoftonline.com/' + this.aadTenantId + '/oauth2/v2.0/token', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then((response) => {
                resolve((response.data).access_token)
            })
            .catch((error) => {
                reject(error)
            });
        });
    }

    // Get BTP Access Token to access SAP Cloud Integration by exchanging SAML Assertion to BTP OAuth token issued by xsuaa
    // If token is provided, the access token request can be skipped (e.g. when bot oAuth connection is used)

    /**
     * This method allows to request an OAuth token for SAP BTP access like calling Integration Flows
     * 
     * Requesting such an OAuth token consists of multiple consecutive steps which will be outlined below. 
     * 
     * The first step (_getAccessTokenForBtpSamlAssertion) will make use of the on-behalf-of flow again by using current 
     * Microsoft Teams token and exchanging it to a an application access token issued by the extension application registration. 
     * This token will contain a custom scope allowing us to request a SAML assertion in the next step. In case of bot usage, 
     * this step can be skipped as the OAuth connection feature of the Bot service will return this application access token. 
     * 
     * Once the application access token including the custom scope is available, it can be used to obtain a SAML assertion 
     * from the application registration created when configuring the trust between SAP BTP and Azure AD. This SAML assertion 
     * can further on be used to retriev a valid oAuth token from SAP BTP (_getSamlAssertionForBtpTokenExchange).
     * 
     * The SAML assertion is send to the XSUAA authentication endpoint of the SAP BTP subaccount. Due to the trust, between 
     * Azure AD and SAP BTP, XSUAA will process the SAML assertion and issue an oAuth token which can now be used to access
     * SAP BTP ressources like Integration Flows of SAP Cloud Integration. 
     * 
     */
    async getAccessTokenForBtpAccess (req, token){
        try {
            if(!token) token = await this._getAccessTokenForBtpSamlAssertion(req);
            const samlAssertionAzureAd = await this._getSamlAssertionForBtpTokenExchange(token);
            
            const data = qs.stringify({
                assertion: samlAssertionAzureAd,
                grant_type: this.grantTypeSaml
            });

            // This token endpoint is able to process the SAML assertion
            const btpTokenEndpoint = this.xsuaaUrl + this.btpTokenEndpoint;

            // Request a new OAuth token for SAP Cloud Integration apiaccess using the SAML assertion
            // and the respective client id and secret of the process integration runtime instance. 
            let res = await (async () => {
                try {
                    let resp = await axios.post(btpTokenEndpoint, data, {
                        auth: {
                            username: this.xsuaaClientId,
                            password: this.xsuaaSecret
                        },
                        headers: {
                            'Content-Type': this.headerUrlEncoded
                        }
                    });
                    return resp;
                } catch (err) {
                    console.error(err);
                }
            })();

            // The access token can now be extracted from the result
            if (res.data && res.headers['content-type'].includes('application/json')){
                const responseBody = res.data;
                let accessToken = " ";
                try{   
                    accessToken = responseBody["access_token"].toString();
                    return accessToken;
                }
                catch (err){
                    console.error("No JSON response. Access Token request failed");
                }                
            }else{
                console.error("HTTP Response was invalid and cannot be deserialized.");
            }
        } catch(err){
            console.error(err);

            if(err.error === 'invalid_grant' || err.error === 'interaction_required'){
                throw new Error(err.error);
            }
        }
    }

    // Get BTP Access Token to access SAP Destination service by exchanging SAML Assertion to BTP OAuth token issued by xsuaa
    // If token is provided, the access token request can be skipped (e.g. when bot oAuth connection is used)

    /**
     * This method allows to request an OAuth token for SAP BTP access like calling Integration Flows
     * 
     * Requesting such an OAuth token consists of multiple consecutive steps which will be outlined below. 
     * 
     * The first step (_getAccessTokenForBtpSamlAssertion) will make use of the on-behalf-of flow again by using current 
     * Microsoft Teams token and exchanging it to a an application access token issued by the extension application registration. 
     * This token will contain a custom scope allowing us to request a SAML assertion in the next step. In case of bot usage, 
     * this step can be skipped as the OAuth connection feature of the Bot service will return this application access token. 
     * 
     * Once the application access token including the custom scope is available, it can be used to obtain a SAML assertion 
     * from the application registration created when configuring the trust between SAP BTP and Azure AD. This SAML assertion 
     * can further on be used to retriev a valid oAuth token from SAP BTP (_getSamlAssertionForBtpTokenExchange).
     * 
     * The SAML assertion is send to the XSUAA authentication endpoint of the SAP BTP subaccount. Due to the trust, between 
     * Azure AD and SAP BTP, XSUAA will process the SAML assertion and issue an oAuth token which can now be used to access
     * SAP BTP ressources like Destination. 
     * 
     */
     async getAccessTokenForBtpDestinationAccess (req, token){
        try {
            if(!token) token = await this._getAccessTokenForBtpSamlAssertion(req);
            const samlAssertionAzureAd = await this._getSamlAssertionForBtpTokenExchange(token);
            
            const data = qs.stringify({
                assertion: samlAssertionAzureAd,
                grant_type: this.grantTypeSaml
            });

            // This token endpoint is able to process the SAML assertion
            const btpTokenEndpoint = this.xsuaaUrl + this.btpTokenEndpoint;

            // Request a new OAuth token for SAP Cloud Integration apiaccess using the SAML assertion
            // and the respective client id and secret of the process integration runtime instance. 
            let res = await (async () => {
                try {
                    let resp = await axios.post(btpTokenEndpoint, data, {
                        auth: {
                            username: this.destXsuaaClientId,
                            password: this.destXsuaaSecret
                        },
                        headers: {
                            'Content-Type': this.headerUrlEncoded
                        }
                    });
                    return resp;
                } catch (err) {
                    console.error(err);
                }
            })();

            // The access token can now be extracted from the result
            if (res.data && res.headers['content-type'].includes('application/json')){
                const responseBody = res.data;
                let accessToken = " ";
                try{   
                    accessToken = responseBody["access_token"].toString();
                    return accessToken;
                }
                catch (err){
                    console.error("No JSON response. Access Token request failed");
                }                
            }else{
                console.error("HTTP Response was invalid and cannot be deserialized.");
            }
        } catch(err){
            console.error(err);

            if(err.error === 'invalid_grant' || err.error === 'interaction_required'){
                throw new Error(err.error);
            }
        }
    }

    // Get Destination Values
    async getDestinationDetails (destinationServiceCred, destinationName){
        //get destination token
        let res;
        try {
            const oAuthUrl = destinationServiceCred.url+"/oauth/token";
            const data = qs.stringify({
                grant_type: "client_credentials",
            });
            res = await axios.post(oAuthUrl, data,
                {
                    auth: {
                        username: destinationServiceCred.clientid,
                        password: destinationServiceCred.clientsecret
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
        } catch (err) {
            console.error("No JSON response. Access Token request failed" + err);
            return err;
        }
        // The access token can now be extracted from the result
        if (res.data && res.headers['content-type'].includes('application/json')){
            try{   
                const token = res.data.access_token;
                const destUrl = destinationServiceCred.uri+"/destination-configuration/v1/destinations/"+destinationName;
                let destResponse = await axios.get(destUrl,
                    {
                        headers: {
                            'Authorization': 'Bearer ' + token,
                        }
                    }
                );
                if (destResponse.data && destResponse.headers['content-type'].includes('application/json')){
                    return destResponse.data;
                } else{
                    console.error("Destination HTTP Response was invalid and cannot be deserialized.");
                    return new Error("Destination HTTP Response was invalid and cannot be deserialized.");
                }
            }
            catch (err){
                console.error("No JSON response. Access Token request failed");
                return err;
            }
        } else{
            console.error("HTTP Response was invalid and cannot be deserialized.");
            return new Error("HTTP Response was invalid and cannot be deserialized.");
        }
    }

    // Get SAML Destination config for the principal propagation
     async getSamlDestinationConfiguration (samlTokenEndpoint, token, httpsAgent){
        try {
            let res = await (async () => {
                try {
                    let res = await axios.get(samlTokenEndpoint, {
                        httpsAgent: httpsAgent,
                        headers: {
                            'Authorization': 'Bearer '+token,
                            'X-user-token': token
                        }
                    });
                    return res;
                } catch (err) {
                    console.error(err);
                }
            })();

            // The access token can now be extracted from the result
            if (res.data && res.headers['content-type'].includes('application/json')){
                const responseBody = res.data;
                try{   
                    const destinationUrl = responseBody.destinationConfiguration.URL;
                    const samlAuthToken = responseBody.authTokens[0].value.toString();
                    return {
                        destinationUrl: destinationUrl,
                        samlAuthToken: samlAuthToken
                    }
                }
                catch (err){
                    console.error("No JSON response. Access Token request failed");
                }                
            }else{
                console.error("HTTP Response was invalid and cannot be deserialized.");
            }
        } catch(err){
            console.error(err);

            if(err.error === 'invalid_grant' || err.error === 'interaction_required'){
                throw new Error(err.error);
            }
        }
    }

    // Get Bearer For SAML
    async getBearerForSAML(destinationDetails, samlDestination, httpsAgent){
        try {
            const destinationConfiguration = destinationDetails.destinationConfiguration;
            const user = destinationConfiguration.User.trim();
            const userScope = destinationConfiguration.scope.trim();
            const password = destinationConfiguration.Password.trim();
            const data = qs.stringify({
                assertion: samlDestination.samlAuthToken,
                grant_type: this.grantTypeSaml,
                client_id: user,
                scope: userScope
            });
            let res = await (async () => {
                try {
                    const config = {
                        auth: {
                            username: user,
                            password: password
                        },
                        httpsAgent: httpsAgent,
                        headers: {
                            'Content-Type': "application/x-www-form-urlencoded"
                        }
                    };
                    const resp = await axios.post(samlDestination.destinationUrl, data, config);
                    return resp;
                } catch (err) {
                    console.error(err);
                }
            })();

            // The access token can now be extracted from the result
            if (res.data && res.headers['content-type'].includes('application/json')){
                const responseBody = res.data;
                try{   
                    const accessToken = responseBody.access_token.toString();
                    return accessToken;
                }
                catch (err){
                    console.error("No JSON response. Access Token request failed");
                }                
            }else{
                console.error("HTTP Response was invalid and cannot be deserialized.");
            }
        } catch(err){
            console.error(err);

            if(err.error === 'invalid_grant' || err.error === 'interaction_required'){
                throw new Error(err.error);
            }
        }
    }


    /**
     * This method allows to request an OAuth token which can be used to obtain a SAML assertion using the (on-behalf-of flow)
     * 
     * As for Microsoft Graph access, in a first step the Microsoft Teams user session/token needs to be extracted and can be used
     * to obtain an application access token of the extension application registration. This is possible due to the fact that
     * Microsoft Teams has been added as trusted client to the application registration and by using the on-behalf-of flow. 
     * 
     * Instead of Microsoft Graph scopes, in this case a custom scope is contained in the resulting OAuth token, which can be 
     * used in the further process to exchange it to a valid SAML assertion for BTP access.  
     * 
     */
    async _getAccessTokenForBtpSamlAssertion (req){
        return new Promise((resolve, reject) => {
            const token = this._getAuthDataFromRequest(req);
            const url = `https://login.microsoftonline.com/${ this.aadTenantId }/oauth2/v2.0/token`;
            const params = {
                client_id: this.appId,
                client_secret: this.appSecret,
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: token,
                requested_token_use: 'on_behalf_of',
                scope: this.btpScopes
            };
            // eslint-disable-next-line no-undef
            fetch(url, {
                method: 'POST',
                body: querystring.stringify(params),
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).then(result => {
                if (result.status !== 200) {
                    result.json().then(json => {
                        reject({ error: json.error });
                    });
                } else {
                    result.json().then(async json => {
                        resolve(json.access_token);
                    });
                }
            });
        });
    }

    // Get SAML Assertion for BTP Access (on behalf of flow )

    /**
     * This method allows to request a SAML assertion for SAP BTP access
     * 
     * Using an valid OAuth token (including a custom scope) of the extension application registration, 
     * a SAML assertion can be requested from Azure AD. This is possible due to the fact that the extension
     * application has been added as trusted client to the application registration created when setting
     * up the trust between SAP BTP and Azure Ad. This allows us to use the on-behalf-of flow also in this
     * scenario. The resulting SAML assertion can then be used to obtain a valid oAuth token from XSUAA. 
     * 
     */
    async _getSamlAssertionForBtpTokenExchange (token){

        if (!token || !token.trim()) {
            throw new Error('Invalid token received.');
        }

        const data = qs.stringify({
            assertion: token,
            grant_type: this.grantTypeJwtBearer,
            client_id: this.appId,
            client_secret: this.appSecret,
            resource: this.xsuaaUrl,
            requested_token_use: this.tokenUseValue,
            requested_token_type: this.tokenTypeSaml
        });

        const aadTokenEndpoint = this.aadBasUrl + this.pathOAuth;
        
        let res = await (async () => {
            try {
                let resp = await axios.post(aadTokenEndpoint, data, {
                    headers: {
                        'Content-Type': this.headerUrlEncoded
                    }
                });
                return resp;
            } catch (err) {
                console.error(err);
            }
        })();

        if(res.fstatus == 200){
            // test for status you want, etc
            console.log(res.status)
        }
        
        if (res.data && res.headers['content-type'].includes('application/json')){
            const responseBody = res.data;
            let samlAssertion = " ";
            try{
                samlAssertion = responseBody["access_token"].toString();
                return samlAssertion;
            }
            catch (err){
                console.error("No JSON response. SAML Token request failed");
            }                
        }
        else{
            console.error("HTTP Response was invalid and cannot be deserialized.");
        }
        
    }

    // Helper method to extract the token from an request header. 
    _getAuthDataFromRequest (req) {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1];
        return token;
    }
}

export default AuthClient;
