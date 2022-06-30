/**
 * botActivityHandler.js returns a new instance of the extended TeamsActivityHandler class
 * 
 * This handler allows us include the respective bot dialogs and handles all advanced bot related
 * features like implementing Messaging Extension, implementing tabs based on adaptive cards and
 * all subsequent calls triggered by these bot enhancements. It is of high importance for this project.
 * 
 * It also connects to further services like the BlobStorage container. Check the very end of this 
 * file where actual instance of the extended class is created.
 */

import { 
    TeamsActivityHandler, 
    CardFactory, 
    tokenExchangeOperationName,
    ConversationState,
    UserState,
    TurnContext
} from 'botbuilder'

import { BlobsStorage } from 'botbuilder-azure-blobs'

// Load custom modules and functions
import TokenExchangeHelper from './utils/TokenExchangeHelper.js'
import MainDialog from './dialogs/MainDialog.js'
import * as adaptiveCards from '../models/adaptiveCard.js'

// Load the the approval Waterfall dialog
import ApprovalDialog from './dialogs/ApprovalDialog.js'
const APPROVAL_DIALOG = 'approvalDialog';

// Set further configuration parameters
const USER_CONFIGURATION = 'userConfigurationProperty';
const conversationReferencesStoragePropertyName = 'conversationReferences';

/** 
 * Extend TeamsActivityHandler class for the BotActivityHandler
 * Besides the actual bot dialogs, all bot related actions are implemented in this class by
 * overwriting the methods of the TeamsActivityHandler class. 
 * 
 * https://docs.microsoft.com/en-us/dotnet/api/microsoft.bot.builder.teams.teamsactivityhandler?view=botbuilder-dotnet-stable
 * 
 * If you're interested in further details on Single-Sign-On using bots, please check the following links by Microsoft.
 * This Microsoft Teams extension application is based on the linked GitHub repository propvided by Microsoft!
 * 
 * https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-aad-sso-bots
 * https://github.com/OfficeDev/Microsoft-Teams-Samples/tree/main/samples/app-sso/nodejs 
 */
class BotActivityHandler extends TeamsActivityHandler {
    _botStorage;

    constructor(conversationState, userState, dialog, storage, conversationReferences) {
        super();
       
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!dialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
        if (!conversationReferences) throw new Error('[DialogBot]: Missing parameter. dialog is required');

        // Set this variables
        this.conversationState = conversationState;
        this.userState = userState;

        // the dialog variable contains the MainDialog contains the Leave Request bot dialog 
        this.dialog = dialog;
        this.dialogState = this.conversationState.createProperty('DialogState');

        this.userConfigurationProperty = userState.createProperty(USER_CONFIGURATION);
        this._botStorage = storage;

        this.conversationReferences = conversationReferences;

        // Create new instances of the TokenExchangeHelper class supporting the SSO process 
        this._ssoOAuthHelperGraph = new TokenExchangeHelper(process.env.CONNECTION_NAME_GRAPH,storage);
        this._ssoOAuthHelperBtp = new TokenExchangeHelper(process.env.CONNECTION_NAME_BTP,storage);

        // Handler for bot messages arriving. This will trigger the Main Dialog to be loaded if no conversation exists yet. 
        this.onMessage(async (context, next) => {
            console.log('Running dialog with Message Activity.');

            // Run the Dialog with the new message Activity.
            await this.dialog.run(context, this.dialogState);

            // By calling next() you ensure that the next handler is run.
            await next();
        });

        /** 
         * Handler once the bot is added by a new user sending out a welcome message
         */
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    // Send out Welcome card 
                    const welcomeCard = CardFactory.adaptiveCard(adaptiveCards.welcomeCard());
                    await context.sendActivity({ attachments: [welcomeCard] });
                    await dialog.run(context, conversationState.createProperty('DialogState'));

                    this.addConversationReference(context.activity);
                }
            }
            await next();
        });

        /** 
         * Save to conversation reference once the conversation is updated 
         * The latest conversation reference is required by the bot to send notifications to the correct receipient
         */
        this.onConversationUpdate(async (context, next) => {
            const conversationReference = TurnContext.getConversationReference(context.activity);
            const userId = conversationReference.user?.aadObjectId;
            if (userId) {
                try {
                    // Conversation Reference is stored in the BlobStorage container if not available yet
                    const storeItems = await this._botStorage.read([conversationReferencesStoragePropertyName]);
                    if (!storeItems[conversationReferencesStoragePropertyName]) storeItems[conversationReferencesStoragePropertyName] = {};
                    const conversationReferences = storeItems[conversationReferencesStoragePropertyName];
                    conversationReferences[userId] = conversationReference;
                    await this._botStorage.write(storeItems);
                    this.addConversationReference(context.activity);
                } catch (error) {
                    console.log(error);
                }
            }
            await next();
        })
    }

    async addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        this.conversationReferences[conversationReference.user.aadObjectId] = conversationReference;
    }

    /**
     * Method allows to retreive a user's conversation reference from the BlogStorage container
     */
    async getConversationReference(userId)   {
        try {
            const storeItems = await this._botStorage.read([conversationReferencesStoragePropertyName]);
            if (!storeItems[conversationReferencesStoragePropertyName]) return null;
            const conversationReferences = storeItems[conversationReferencesStoragePropertyName];
            const conversationReference = conversationReferences[userId];
            return conversationReference;
        } catch (error) {
            console.log(error);
            return null;
        }
    }


    /**
     * Override the TeamsActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);
        // Save any state changes. The load happened during the execution of the Dialog.
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    /**
     * Override the TeamsActivityHandler.handleTeamsMessagingExtensionFetchTask() method which allows us to 
     * implement messaging extensions. Once the user clicks on a messaging extension within the message pane,
     * this method is called with the respecitve commandId. 
     */
    async handleTeamsMessagingExtensionFetchTask(context, action) {
        return await super.handleTeamsMessagingExtensionFetchTask(context, action);
    }

    /**
     * Override the TeamsActivityHandler.handleTeamsMessagingExtensionSubmitAction() method which allows us to 
     * handle Submit Actions triggered from within a messaging extension (e.g. when a user clicks on a button
     * in a task module). 
     * 
     */
    async handleTeamsMessagingExtensionSubmitAction(context, action) {
        
        return await super.handleTeamsMessagingExtensionSubmitAction(context, action);
    }


    /**
     * Override the TeamsActivityHandler.handleTeamsTabFetch() method which allows us to handle extension 
     * use-cases in which a bot is providing content for an Microsoft Teams tab in form of adaptive cards. This
     * simplifies the usage of tab extensions as no custom React component needs to be developed
     */
    async handleTeamsTabFetch(context, tabRequest){

        return await super.handleTeamsTabFetch(context, tabRequest);
    }

    /**
     * Override the TeamsActivityHandler.handleTeamsTabSubmit() method which allows us to handle Submit Actions triggered 
     * from within the tab component of the Microsoft Teams extension. This is the case if the tab implementation makes use of 
     * the botActivityHandler framework and displays adaptive cards provided by this handler (see above)
     */
    async handleTeamsTabSubmit(context, tabSubmit){

        return await super.handleTeamsTabSubmit(context, tabSubmit);
    }

    /**
     * Override the TeamsActivityHandler.handleTeamsTaskModuleFetch() method which allows us to handle extension 
     * use-cases in which a the botActvitiyHandler is used to provide the content of a custom task module.
     * 
     * In this case the desired task module is loaded, when a user clicks on the action buttons of the leave request
     * notifications like (Approve/Reject). 
     */
    async handleTeamsTaskModuleFetch(context, taskModuleRequest){

        return await super.handleTeamsTaskModuleFetch(context, taskModuleRequest);
    }

    /**
     * Override the TeamsActivityHandler.handleTeamsTaskModuleSubmit() method which allows us to handle Submit Actions triggered 
     * from within a custom task module. This is the case if the task module has not been loaded from within a messaging extension
     * (see above) but like in our case e.g. wen the user clicks on one of the Action buttons of the Leave Request notification.
     */
    async handleTeamsTaskModuleSubmit(context, taskModuleSubmit){

        return await super.handleTeamsTaskModuleSubmit(context, taskModuleSubmit);
    }


    /**
     * Override the TeamsActivityHandler.onInvokeActivity() according to Microsoft Teams samples for Single Sign On
     */
    async onInvokeActivity(context) {
        const valueObj = context.activity.value;

        if (valueObj.authentication) {
            const authObj = valueObj.authentication;
            if (authObj.token) {
                // If the token is NOT exchangeable, then do NOT deduplicate requests.
                if (await this.tokenIsExchangeable(context)) {
                    return await super.onInvokeActivity(context);
                } else {
                    const response = {
                        status: 412
                    };
                    return response;
                }
            }
        }
        return await super.onInvokeActivity(context);
    }

    /**
     * Override the TeamsActivityHandler.tokenIsExchangeable() according to Microsoft Teams samples for Single Sign On
     */
    async tokenIsExchangeable(context) {
        let tokenExchangeResponse = null;
        try {
            const valueObj = context.activity.value;
            const tokenExchangeRequest = valueObj.authentication;
            tokenExchangeResponse = await context.adapter.exchangeToken(
                context, 
                process.env.CONNECTION_NAME_GRAPH, 
                context.activity.from.id,
                { token: tokenExchangeRequest.token }
            );
        } catch (err) {
            console.log('tokenExchange error: ' + err);
            // Ignore Exceptions
            // If token exchange failed for any reason, tokenExchangeResponse above stays null, 
            // and hence we send back a failure invoke response to the caller.
        }
        if (!tokenExchangeResponse || !tokenExchangeResponse.token) {
            return false;
        }
        return true;
    }

    /**
     * Override the TeamsActivityHandler.handleTeamsSigninVerifyState() according to Microsoft Teams samples for Single Sign On
     */
    async handleTeamsSigninVerifyState(context, state) {
        await this.dialog.run(context, this.dialogState);
    }

    /**
     * Override the TeamsActivityHandler.onSignInInvoke() according to Microsoft Teams samples for Single Sign On
     * 
     * This is invoked when the TokenExchangeInvokeRequest is coming back from the Client 
     * https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-aad-sso-bots
     */
    async onSignInInvoke(context) {
        // The tokenExchangeOperationName should be signin/tokenExchange
        if (context.activity && context.activity.name === tokenExchangeOperationName) {
            // The ssoOAuthHelper will attempt the exchange, and if successful, it will cache the result in TurnState.
            // This is then read by SsoOAuthPrompt, and processed accordingly 

            if(context.activity.value.CONNECTION_NAME_GRAPH === process.env.CONNECTION_NAME_BTP){
                // If the token is not exchangeable, do not process this activity further.
                // The ssoOAuthHelper will send the appropriate response if the token is not exchangeable.
                if (!await this._ssoOAuthHelperBtp.shouldProcessTokenExchange(context)) return;
            }

            if(context.activity.value.CONNECTION_NAME_GRAPH === process.env.CONNECTION_NAME_GRAPH){
                if (!await this._ssoOAuthHelperGraph.shouldProcessTokenExchange(context)) return;
            }

        }
        // Run the dialog with the new context including the exchanged token
        await this.dialog.run(context, this.dialogState);
    }

     /**
     * Override the TeamsActivityHandler.onTokenResponseEvent() according to Microsoft Teams samples for Single Sign On
     */
    async onTokenResponseEvent(context) {
        // Run the Dialog with the new Token Response Event Activity.
        await this.dialog.run(context, this.dialogState);
    }


     /**
     * Helper method to get new token for messaging extension scenario
     * Makes use of the silentAuth adaptive card allowing Single Sign On 
     */
    async _getTokenForConnectionMsgExt (context, connection){

        // There is no token, so the user has not signed in yet.
        // Retrieve the OAuth Sign in Link to use in the MessagingExtensionResult Suggested Actions
        const signInLink = await context.adapter.getSignInLink(
            context,
            connection,
        );

        return {
            composeExtension: {
                type: 'silentAuth',
                suggestedActions: {
                    actions: [
                        {
                            type: 'openUrl',
                            value: signInLink,
                            title: 'Setup your access for the first time!'
                        }
                    ]
                }
            }
        };
    }

    /**
     * Helper method to get new token for the tab extension scenario implemented va the bot framework
     * Makes use of the auth adaptive card, which does not support single sign on
     * silentAuth adaptive card is not working in case of tabs implemented via the bot framework 
     */
    async _getTokenForConnectionTabCards (context, connection){
        // Retrieve the OAuth Sign in Link
        const signInLink = await context.adapter.getSignInLink(context,connection);

        return {
            tab: {
                type: "auth",
                suggestedActions: {
                    actions: [
                        {
                            type: "openUrl",
                            value: signInLink,
                            title: "Sign in to this app"
                        }
                    ]
                }
            }
        };
    }

     /**
     * Helper method to get the url for loading the task module 
     */
    _getTaskModuleUrl(replyToId, taskType, taskAction, payloadData) {
        let url =  `https://${process.env.DOMAIN}/task-module`;

        url += `?replyToId=${encodeURIComponent(replyToId)}`;
        url += `&taskType=${encodeURIComponent(taskType)}`;
        url += `&taskAction=${encodeURIComponent(taskAction)}`;
        
        // for (const [key, value] of Object.entries(payloadData)) {
        //     url += `&${key}=${encodeURIComponent(value)}`;
        // }
        return url;
    }

}

// Create a new BlobStorage instance making use of the BlobStorage container created within AzureAD
const storage = new BlobsStorage(process.env.MICROSOFT_BLOB_CONNECTION_STRING || '', process.env.MICROSOFT_BLOB_CONTAINER_NAME || '');

// Create a new ConversationState instance providing the blobStorage instance
const conversationState = new ConversationState(storage);
// Create a new UserState instance providing the botStorage instance
const userState = new UserState(storage);

// Create a new instance of the Main Dialog, which is a wrapper for the Leave Request dialog and potential further bot dialogs
// The Main dialog will be passed to the botActivtityHandler on initialization

const approvalDialog = new ApprovalDialog(APPROVAL_DIALOG);

const mainDialog = new MainDialog({
    approvalDialog: approvalDialog
});

const conversationReferences = {};

// Here the actual instance of the BotActivityHandler for our extension application is created
// Besides conversationState and userState, also the mainDialog for the bot (containing all potential subdialogs) and the 
// bot storage (blobStorage container) is passed as constructor parameters. 
const botActivityHandler = new BotActivityHandler(conversationState, userState, mainDialog, storage,conversationReferences);

export default botActivityHandler
