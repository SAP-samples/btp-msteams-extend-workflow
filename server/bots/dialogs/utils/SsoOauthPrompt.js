/**
 * SsoOauthPrompt.js provides an extended class based on the OAuthPrompt class
 * Based on the sample code provided by Microsoft in https://github.com/OfficeDev/Microsoft-Teams-Samples/tree/main/samples/app-sso/nodejs
 * 
 * This enhancement of the standard OAuthPrompt, allows the bot to make use of an already exchanged OAuth token, instead of requesting a 
 * new OAuth token each time the OAuthPrompt dialog is triggered by the bot. Otherwise each time a token for an OAuth connection is required,
 * a new token exchange would be triggered. 
 * 
 * Find further details on bot SSO using the following Microsoft documentations: 
 * https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-aad-sso-bots
 * https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-sso?view=azure-bot-service-4.0 
 * 
 * --- Token Exchange flow ---
 * 
 * If an OAuth connection token is required, a token exchange process needs to be conducted. Therefor the bot sends an OAuthPrompt 
 * activity to the Microsoft Teams client (see ApprovalDialog.js). Microsoft Teams tries to request an authentication token for the bot application 
 * from Azure AD. If obtaining this token fails, the user is asked to login first. The resulting token issued by Azure AD is send in 
 * an TokenExchangeInvokeRequest back to the bot. 
 * 
 * The bot now checks in the extended OAuthPrompt class (see SsoOAuthPrompt.js) whether an exchanged token (e.g. for Graph Access) 
 * already exsits in the turnState. If this is the case, the token exchange process is ended and the existing token is used for the 
 * further process. A successfull TokenExchangeInvokeResponse needs to be returned so the Microsoft Teams client knows the token could be 
 * successfully exchanged and the OAuthPrompt dialog can be ended. 
 * 
 * If no token has been exchanged yet, the process continues and an invoke activity will be triggered (signin/tokenExchange) by 
 * the OAuthPrompt dialog. Now the the TokenExchangeHelper will start it's job. It will take the tokenExchangeRequest send by the Microsoft 
 * Teams Client (containing the Azure AD authentication token) and try to exchange it to an OAuth token issued by the required 
 * OAuth Connection. 
 * 
 * If this exchange is successfull, the Single-Sign-On process is ending and the exchanged OAuth token is saved in the turnState. 
 * The dialog is run again with the new context including the exchanged token now. The exchanged token can now also be used by 
 * the SsoOAuthPrompt.js for further exchange processes. If the exchange fails, a fallback is triggered and and further user interaction is required.
 */

import { OAuthPrompt } from 'botbuilder-dialogs'
import { StatusCodes, ActivityTypes } from 'botbuilder'

/**
 * Response body returned for a token exchange invoke activity.
 */
class TokenExchangeInvokeResponse {
    constructor(id, connectionName, failureDetail) {
        this.id = id;
        this.connectionName = connectionName;
        this.failureDetail = failureDetail;
    }
}

class SsoOAuthPrompt extends OAuthPrompt {
    async continueDialog(dialogContext) {
        // If the token was successfully exchanged already, it should be cached in TurnState along with the TokenExchangeInvokeRequest
        var cachedTokenResponse = '';
        
        if(dialogContext.context.turnState.tokenResponse){
            cachedTokenResponse = dialogContext.context.turnState.tokenResponse;
        }

        // If the token was successfully exchanged already, the OAuthPrompt dialog can be ended and the cached token can be returned
        if (cachedTokenResponse) {
            const tokenExchangeRequest = dialogContext.context.turnState.tokenExchangeInvokeRequest;

            if (!tokenExchangeRequest) { throw new Error('TokenResponse is present in TurnState, but TokenExchangeInvokeRequest is missing.') }

            // PromptRecognizerResult
            const result = {};

            // TokenExchangeInvokeResponse
            const exchangeResponse = new TokenExchangeInvokeResponse(tokenExchangeRequest.id, this.settings.connectionName, this.failureDetail);

            await dialogContext.context.sendActivity({
                type: ActivityTypes.InvokeResponse,
                value:{
                    status: StatusCodes.OK,
                    body: exchangeResponse
                }
            });

            result.succeeded = true;
            
            // TokenResponse
            result.value = {
                channelId: cachedTokenResponse.channelId,
                connectionName: this.settings.connectionName,
                token: cachedTokenResponse.token
            };

            return await dialogContext.endDialog(result.value);
        }
        return await super.continueDialog(dialogContext);
    }
}

export default SsoOAuthPrompt
