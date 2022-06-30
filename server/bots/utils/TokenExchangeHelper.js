/**
 * The TokenExchangeHelper.js supports the SSO process for the bot framework. It has been implemented based on the 
 * samples provided by the Microsoft Teams samples for SSO scenarios. Please refer to the official Microsoft Teams documentation
 * for SSO scenarios to get a better understanding what's happening here. 
 * 
 * https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-aad-sso-bots
 * 
 * The SsoAuthHelper handles the token exchange of a token send by the client via a tokenExchangeRequest
 * This request contains an authentication token for the bot application provided by Azure AD. This token
 * is being used to be exchanged against a token issued by the OAuth connection configured in the Bot Service. 
 * 
 * Find more details on the SSO flow in the SsoOAuthPrompt.js file within the dialog/utils folder
 */

import { StatusCodes, ActivityTypes, tokenExchangeOperationName } from 'botbuilder';

class TokenExchangeHelper {

    constructor(oAuthConnectName, storage) {
        this.oAuthConnectName = oAuthConnectName;
        this.storage = storage;
    }

    /** 
     * Determines if a "signin/tokenExchange" should be processed by this caller.
     * If a token exchange is unsuccessful, an InvokeResponse of PreconditionFailed is sent.
     * The "turnContext" parameter is the turnContext for this specific activity.
     * Returns true if the bot should continue processing this TokenExchange request
     */
    async shouldProcessTokenExchange(turnContext) {
        if (turnContext.activity.name !== tokenExchangeOperationName) {
            throw new Error("Only 'signin/tokenExchange' invoke activities can be procssed by the TokenExchangeHelper.");
        }

        if (!await this.exchangedToken(turnContext)) {
            // If the TokenExchange is NOT successful, the response will have already been sent by ExchangedToken
            return false;
        }

        // If a user is signed into multiple Teams clients, the Bot might receive a "signin/tokenExchange" from each client.
        // Each token exchange request for a specific user login will have an identical activity.value.Id.
        // Only one of these token exchange requests should be processe by the bot.  For a distributed bot in production,
        // this requires a distributed storage to ensure only one token exchange is processed.

        // This example utilizes Bot Framework IStorage's ETag implementation for token exchange activity deduplication.
        // Create a StoreItem with Etag of the unique 'signin/tokenExchange' request
        const storeItem = {
            eTag: turnContext.activity.value.id
        };

        const storeItems = { [this.getStorageKey(turnContext)]: storeItem };

        try {
            this.storage.write(storeItems);
        } catch (err) {
            console.log('Could not write to storage');
            if (err instanceof Error && err.message.startsWith('Etag conflict')) {
                console.log('Etag conflict : ' + err);
                return false;
            }
        }
        return true;
    }

    // Try to exchange the application token provided by Azure AD to the token issued by the respective OAuth connection
    async exchangedToken(turnContext) {
        let tokenExchangeResponse = null;
        const tokenExchangeRequest = turnContext.activity.value;

        try {
            // turnContext.adapter IExtendedUserTokenProvider
            tokenExchangeResponse = await turnContext.adapter.exchangeToken(
                turnContext,
                tokenExchangeRequest.connectionName,
                turnContext.activity.from.id,
                { token: tokenExchangeRequest.token }
            );
            console.log('tokenExchangeResponse: ' + JSON.stringify(tokenExchangeResponse));
        } catch (err) {
            console.log(err);
            // Ignore Exceptions
            // If token exchange failed for any reason, tokenExchangeResponse above stays null and an exception is sen
        }

        if (!tokenExchangeResponse || !tokenExchangeResponse.token ) {
            // The token could not be exchanged (which could be due to a consent requirement)
            // Notify the sender that PreconditionFailed so they can respond accordingly.
            await turnContext.sendActivity({
                type: ActivityTypes.InvokeResponse,
                value:{
                    status: StatusCodes.PRECONDITION_FAILED,
                    // TokenExchangeInvokeResponse
                    body:{
                        id: tokenExchangeRequest.id,
                        connectionName: tokenExchangeRequest.connectionName,
                        failureDetail: 'The bot is unable to exchange token. Proceed with regular login.'
                    }
                }
            });

            return false;

        } else {
            // Store response in TurnState, so the SsoOAuthPrompt can use it, and does not have to do the exchange again.
            turnContext.turnState.tokenExchangeInvokeRequest = tokenExchangeRequest;
            turnContext.turnState.tokenResponse = tokenExchangeResponse;
        }

        return true;
    }

    // Build the storage key from the turn context 
    getStorageKey(turnContext) {
        if (!turnContext || !turnContext.activity || !turnContext.activity.conversation) {
            throw new Error('Invalid context, can not get storage key!');
        }
        const activity = turnContext.activity;
        const channelId = activity.channelId;
        const conversationId = activity.conversation.id;
        if (activity.type !== ActivityTypes.Invoke || activity.name !== tokenExchangeOperationName) {
            throw new Error('TokenExchangeState can only be used with Invokes of signin/tokenExchange.');
        }
        const value = activity.value;
        if (!value || !value.id) {
            throw new Error('Invalid signin/tokenExchange. Missing activity.value.id.');
        }
        return `${ channelId }/${ conversationId }/${ value.id }`;
    }
}

export default TokenExchangeHelper
