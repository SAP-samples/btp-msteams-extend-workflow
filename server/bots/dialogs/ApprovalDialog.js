/**
 * ApprovalDialog.js returns a class extending the CancelAndHelpDialog class
 * 
 * The CancelAndHelpDialog class can be found in the utils and is an extension of the standard ComponentDialog class.
 * It offers additional features to handle communication interruptions (e.g. user cancels or requires help).
 * 
 * This class provides the implementation of the bot's Leave Request dialog. It is loaded by the Waterfall Dialog of 
 * the Main Dialog, in case the user goes for the Leave Request scenario. The Leave Request dialog is also implemented
 * as Watefall Dialog consisting of multiple steps, to get the information required to send a new Leave Request to 
 * SAP SuccessFactors. 
 */

// Load standard modules
import { WaterfallDialog, ChoicePrompt } from 'botbuilder-dialogs'
import { ActivityTypes, MessageFactory } from 'botbuilder'
import { InputHints } from 'botbuilder'

// Load custom modules and functions
import CancelAndHelpDialog from './utils/CancelAndHelpDialog.js'
import SsoOAuthPrompt from './utils/SsoOauthPrompt.js'
import AuthClient from '../../services/AuthClient.js'
import * as adaptiveCards from '../../models/adaptiveCard.js'
import s4HANAClient from '../../services/S4HANAClient.js'

// Set constants
const OAUTH_PROMPT_GRAPH = 'OAuthPromptGraph';
const OAUTH_PROMPT_BTP = 'OAuthPromptBtp';
const CHOICE_PROMPT = 'ChoicePrompt';
const WATERFALL_DIALOG  = 'WaterfallDialog';

// Extend from CancelAndHelpDialog, which is a standard ComponentDialog enhanced by additional
// features for interrupting a dialog e.g. by typing "help" or "cancel"
class ApprovalDialog extends CancelAndHelpDialog {
    constructor(dialogId) {
        super(dialogId || 'approvalDialog');

        // Add OAuth prompt to obtain Graph Connection token to the dialog
        this.addDialog(new SsoOAuthPrompt(OAUTH_PROMPT_GRAPH, {
            connectionName: process.env.CONNECTION_NAME_GRAPH,
            text: 'Please Sign In',
            title: 'Sign In',
            timeout: 300000
        }));

         // Add OAuth prompt to obtain SAP BTP Connection token to the dialog
        this.addDialog(new SsoOAuthPrompt(OAUTH_PROMPT_BTP, {
            connectionName: process.env.CONNECTION_NAME_BTP,
            text: 'Please Sign In',
            title: 'Sign In',
            timeout: 300000
        }));

        // Add a standard choice prompt to the dialog
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT))

        // Add the Leave Request Waterfall Dialog to the dialog
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                
                // 1 - Get OAuth token to obtain SAML assertion for SAP BTP access
                this.getBtpToken.bind(this),

                // 2 - Request time types right after fetching token - User Interaction
                this.approveWorkflow.bind(this), 
        ]));

        // Start the Leave Request Dialog by running the WaterfallDialog definded above
        this.initialDialogId = WATERFALL_DIALOG;
    }


   
    /**
     * Leave Request Waterfall Dialog step wich is being used multiple times 
     * Get a new OAuth token for the SAP BTP OAuth connection by starting the OAuth prompt as new Dialog
     * This OAuth token can then be used to obtain a new SAML assertion for BTP access
     */
    async getBtpToken(stepContext) {   
        return await stepContext.beginDialog(OAUTH_PROMPT_BTP);
    }

    /**
     * Sventh step of Leave Request Waterfall Dialog 
     * Load the available balance for the time type selected by the user and provide him an adaptive card
     * to request additional input on the Leave and Return date. Use the OAuth token of the previous 
     * Waterfall Dialog step to get access to SAP BTP. SAP BTP Connection token is not cached, as user
     * might continue a dialog when the validity of a token has already expired. 
     */
    async approveWorkflow(stepContext) { 
        const selection = stepContext.context.activity.value;

        // Check if user selected a Time Type
        if(!stepContext.result){
            await stepContext.context.sendActivity("An error occured! Please restart the conversation!");
            return await stepContext.endDialog();
        }

        // Send status and save the message id to the replyToIds
        //var loadingMsgResponse = await stepContext.context.sendActivity("...Time Balance being fetched!...One moment please...");

        // Show typing indicator until data arrives
        await stepContext.context.sendActivity({ type : ActivityTypes.Typing });

        
        // Get Btp OAuth token issued by XSUAA using the OAuth token provided by the SAP BTP OAuth Connection
        // A token exchange using a SAML assertion is conducted by the AuthClient



        const authClient = new AuthClient();
        const prId = stepContext.context.activity.value.dataStore.PurchaseRequisition;
        const wfId = stepContext.context.activity.value.dataStore.wfId;
        const decisionKey = stepContext.context.activity.text.toLowerCase()==='approve'?'0001':'0002';
        const replyToId = stepContext.context.activity.replyToId
        const scenario = process.env.SCENARIO;
        let responseStatus;
        const btpOAuthToken = await authClient.getAccessTokenForBtpDestinationAccess('', stepContext.result.token);
        if(scenario === "azureprivatecloud"){
            //call wf via private link for action
            responseStatus = await s4HANAClient.callWFActionUsingPrivateLinkPP(wfId,decisionKey,btpOAuthToken);
        } else {
            //call wf via Cloud Sdk for action
            responseStatus = await s4HANAClient.callWFActionUsingCloudSdk(wfId,decisionKey,btpOAuthToken);
        }
        if(responseStatus == 200){
                // Update the original adaptive card
                const message = MessageFactory.attachment(adaptiveCards.PurchaseRequisitionCard(
                    stepContext.context.activity.value.dataStore,stepContext.context.activity.text.toLowerCase()));
                message.id = replyToId;
                await stepContext.context.updateActivity(message,InputHints.IgnoringInput); 
        } else {
            const actionStatus= stepContext.context.activity.text.toLowerCase()==='approve'?'approving':'rejecting';
            const message = `Error occured from server while ${actionStatus} Purchase Requistion ${prId}.Please try again.`;
            await stepContext.context.sendActivity(message, message, InputHints.IgnoringInput);
        }

        return await stepContext.endDialog();
    }

}



export default ApprovalDialog
